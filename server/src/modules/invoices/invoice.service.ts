import type { Currency, InvoiceStatus } from '@clientflow/shared';
import { Types, isValidObjectId, type FilterQuery } from 'mongoose';

import { ClientModel, type ClientDocument } from '../../models/Client.model.js';
import {
  InvoiceModel,
  toInvoiceContract,
  type Invoice,
  type InvoiceDocument,
  type InvoiceItem,
} from '../../models/Invoice.model.js';
import {
  WorkLogModel,
  type WorkLogDocument,
} from '../../models/WorkLog.model.js';
import { ApiError } from '../../utils/api-error.js';
import { getClient } from '../clients/client.service.js';
import {
  assertActorPermission,
  workLogVisibilityQuery,
  type WorkspaceActor,
} from '../../auth/workspace-context.js';
import type {
  CreateInvoiceInput,
  GenerateInvoiceFromWorkLogsInput,
  UpdateInvoiceInput,
} from './invoice.validation.js';

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function requireValidInvoiceId(invoiceId: string) {
  if (!isValidObjectId(invoiceId)) {
    throw new ApiError(404, 'Invoice not found.');
  }
}

function invoiceClient(client: ClientDocument) {
  return {
    id: client._id.toString(),
    name: client.name,
    companyName: client.companyName ?? null,
  };
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function calculateTotals(
  items: InvoiceItem[],
  discount: number,
  taxRate: number,
) {
  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + item.amount, 0),
  );
  const safeDiscount = roundMoney(Math.min(discount, subtotal));
  const taxableAmount = Math.max(0, subtotal - safeDiscount);
  const taxAmount = roundMoney((taxableAmount * taxRate) / 100);
  const total = roundMoney(taxableAmount + taxAmount);

  return {
    subtotal,
    discount: safeDiscount,
    taxRate: roundMoney(taxRate),
    taxAmount,
    total,
  };
}

function normalizedItems(
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    workLogId?: string;
  }>,
): InvoiceItem[] {
  return items.map((item) => ({
    description: item.description.trim(),
    quantity: roundMoney(item.quantity),
    rate: roundMoney(item.rate),
    amount: roundMoney(item.quantity * item.rate),
    ...(item.workLogId
      ? { workLogId: new Types.ObjectId(item.workLogId) }
      : {}),
  }));
}

function roundedInvoiceHours(hours: number, roundingMinutes: number) {
  if (!roundingMinutes) {
    return hours;
  }

  const roundedMinutes =
    Math.round((hours * 60) / roundingMinutes) * roundingMinutes;
  const safeMinutes = hours > 0 ? Math.max(roundingMinutes, roundedMinutes) : 0;

  return roundMoney(safeMinutes / 60);
}

function workLogIdsFromItems(items: InvoiceItem[]) {
  return [
    ...new Set(
      items.flatMap((item) =>
        item.workLogId ? [item.workLogId.toString()] : [],
      ),
    ),
  ];
}

async function nextInvoiceNumber(actor: WorkspaceActor) {
  const prefix =
    actor.organization.invoicePrefix?.trim().toUpperCase() || 'INV';
  const invoices = await InvoiceModel.find({
    organizationId: actor.organization._id,
    invoiceNumber: new RegExp(`^${escapeRegex(prefix)}-\\d+$`),
  }).select('invoiceNumber');
  const maxNumber = invoices.reduce((currentMax, invoice) => {
    const match = invoice.invoiceNumber.match(/(\d+)$/);
    const parsed = match ? Number(match[1]) : 0;
    return Number.isFinite(parsed) ? Math.max(currentMax, parsed) : currentMax;
  }, 0);

  return `${prefix}-${String(maxNumber + 1).padStart(4, '0')}`;
}

async function contractsForInvoices(invoices: InvoiceDocument[]) {
  const clientIds = [
    ...new Set(invoices.map((invoice) => invoice.clientId.toString())),
  ];
  const clients = await ClientModel.find({ _id: { $in: clientIds } });
  const clientsById = new Map(
    clients.map((client) => [client._id.toString(), invoiceClient(client)]),
  );

  return invoices.flatMap((invoice) => {
    const client = clientsById.get(invoice.clientId.toString());
    return client ? [toInvoiceContract(invoice, client)] : [];
  });
}

async function contractForInvoice(invoice: InvoiceDocument | null) {
  if (!invoice) {
    return null;
  }

  const client = await ClientModel.findById(invoice.clientId);
  if (!client) {
    return null;
  }

  return toInvoiceContract(invoice, invoiceClient(client));
}

async function requireInvoiceWorkLogs(
  actor: WorkspaceActor,
  clientId: string,
  workLogIds: string[],
  currentInvoiceId?: string,
) {
  const uniqueIds = [...new Set(workLogIds)];

  if (uniqueIds.some((workLogId) => !isValidObjectId(workLogId))) {
    throw new ApiError(422, 'Select valid work logs for this invoice.');
  }

  const workLogs = await WorkLogModel.find({
    _id: { $in: uniqueIds },
    ...(await workLogVisibilityQuery(actor)),
  });

  if (workLogs.length !== uniqueIds.length) {
    throw new ApiError(422, 'Some selected work logs were not found.');
  }

  for (const workLog of workLogs) {
    if (workLog.clientId.toString() !== clientId) {
      throw new ApiError(
        422,
        'All linked work logs must belong to the selected client.',
      );
    }

    if (!workLog.billable) {
      throw new ApiError(422, 'Only billable work logs can be invoiced.');
    }

    if (workLog.status === 'running') {
      throw new ApiError(422, 'Running timers cannot be added to invoices.');
    }

    if (
      workLog.invoiceId &&
      workLog.invoiceId.toString() !== currentInvoiceId
    ) {
      throw new ApiError(
        409,
        'One or more selected work logs already belong to another invoice.',
      );
    }
  }

  return workLogs;
}

async function syncInvoiceWorkLogs(
  actor: WorkspaceActor,
  invoiceId: string,
  clientId: string,
  nextWorkLogIds: string[],
) {
  await requireInvoiceWorkLogs(actor, clientId, nextWorkLogIds, invoiceId);

  const previousWorkLogs = await WorkLogModel.find({
    invoiceId,
    organizationId: actor.organization._id,
  }).select('_id');
  const previousIds = previousWorkLogs.map((workLog) => workLog._id.toString());
  const nextIds = [...new Set(nextWorkLogIds)];
  const removedIds = previousIds.filter(
    (workLogId) => !nextIds.includes(workLogId),
  );
  const addedIds = nextIds.filter(
    (workLogId) => !previousIds.includes(workLogId),
  );

  if (removedIds.length > 0) {
    await WorkLogModel.updateMany(
      {
        _id: { $in: removedIds },
        organizationId: actor.organization._id,
        invoiceId,
      },
      { $unset: { invoiceId: 1 } },
    );
  }

  if (addedIds.length > 0) {
    await WorkLogModel.updateMany(
      { _id: { $in: addedIds }, organizationId: actor.organization._id },
      { $set: { invoiceId } },
    );
  }
}

function baseQuery(
  actor: WorkspaceActor,
  filters: {
    clientId?: string;
    startDate?: Date;
    endDate?: Date;
  },
): FilterQuery<Invoice> {
  const query: FilterQuery<Invoice> = {
    organizationId: actor.organization._id,
  };

  if (filters.clientId) {
    if (!isValidObjectId(filters.clientId)) {
      throw new ApiError(422, 'Select a valid client filter.');
    }

    query.clientId = filters.clientId;
  }

  if (filters.startDate || filters.endDate) {
    query.issueDate = {};

    if (filters.startDate) {
      query.issueDate.$gte = startOfDay(filters.startDate);
    }

    if (filters.endDate) {
      query.issueDate.$lte = endOfDay(filters.endDate);
    }
  }

  return query;
}

async function payloadForManualInvoice(
  actor: WorkspaceActor,
  input: {
    clientId: string;
    issueDate: Date;
    dueDate: Date;
    currency: Currency;
    items: Array<{
      description: string;
      quantity: number;
      rate: number;
      workLogId?: string;
    }>;
    discount: number;
    taxRate: number;
    notes?: string;
    status: InvoiceStatus;
    currentInvoiceId?: string;
  },
) {
  const client = await getClient(actor, input.clientId);
  const items = normalizedItems(input.items);
  const workLogIds = workLogIdsFromItems(items);
  await requireInvoiceWorkLogs(
    actor,
    client._id.toString(),
    workLogIds,
    input.currentInvoiceId,
  );
  const totals = calculateTotals(items, input.discount, input.taxRate);

  return {
    client,
    items,
    workLogIds,
    payload: {
      clientId: client._id,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      currency: input.currency,
      items,
      ...totals,
      notes:
        input.notes?.trim() ||
        actor.organization.defaultInvoiceNotes ||
        undefined,
      status: input.status,
      paidAt: input.status === 'paid' ? new Date() : undefined,
    },
  };
}

function generatedItemForWorkLog(
  workLog: WorkLogDocument,
  roundingMinutes: number,
) {
  return {
    description: `${workLog.title} (${workLog.workDate.toLocaleDateString()})`,
    quantity: roundedInvoiceHours(workLog.durationHours, roundingMinutes),
    rate: workLog.hourlyRate,
    workLogId: workLog._id.toString(),
  };
}

export async function listInvoices(
  actor: WorkspaceActor,
  filters: {
    search?: string;
    status: InvoiceStatus | 'all';
    clientId?: string;
    startDate?: Date;
    endDate?: Date;
  },
) {
  assertActorPermission(actor, 'invoices.view');
  assertActorPermission(actor, 'financials.view');
  const query: FilterQuery<Invoice> = baseQuery(actor, filters);

  if (filters.status !== 'all') {
    query.status = filters.status;
  }

  if (filters.search) {
    const search = new RegExp(escapeRegex(filters.search), 'i');
    query.$or = [
      { invoiceNumber: search },
      { notes: search },
      { 'items.description': search },
    ];
  }

  const [invoices, statusCounts] = await Promise.all([
    InvoiceModel.find(query).sort({ issueDate: -1, updatedAt: -1 }),
    InvoiceModel.aggregate<{ _id: InvoiceStatus; count: number }>([
      { $match: baseQuery(actor, {}) },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const contracts = await contractsForInvoices(invoices);
  const counts: Record<InvoiceStatus | 'all', number> = {
    all: 0,
    draft: 0,
    sent: 0,
    paid: 0,
    overdue: 0,
    cancelled: 0,
  };

  for (const entry of statusCounts) {
    counts[entry._id] = entry.count;
    counts.all += entry.count;
  }

  const summary = contracts.reduce(
    (totals, invoice) => {
      if (invoice.status !== 'cancelled') {
        totals.totalBilled = roundMoney(totals.totalBilled + invoice.total);
      }

      if (invoice.status === 'paid') {
        totals.totalPaid = roundMoney(totals.totalPaid + invoice.total);
      } else if (invoice.status !== 'cancelled') {
        totals.outstandingAmount = roundMoney(
          totals.outstandingAmount + invoice.total,
        );
      }

      return totals;
    },
    {
      totalBilled: 0,
      totalPaid: 0,
      outstandingAmount: 0,
    },
  );

  return {
    invoices: contracts,
    total: contracts.length,
    counts,
    summary,
  };
}

export async function createInvoice(
  actor: WorkspaceActor,
  input: CreateInvoiceInput,
) {
  assertActorPermission(actor, 'invoices.manage');
  const { client, payload, workLogIds } = await payloadForManualInvoice(actor, {
    ...input,
    status: input.status,
  });
  const invoice = await InvoiceModel.create({
    ...payload,
    invoiceNumber: await nextInvoiceNumber(actor),
    userId: actor.user._id,
    organizationId: actor.organization._id,
    createdByUserId: actor.user._id,
  });

  await syncInvoiceWorkLogs(
    actor,
    invoice._id.toString(),
    client._id.toString(),
    workLogIds,
  );

  return toInvoiceContract(invoice, invoiceClient(client));
}

export async function generateInvoiceFromWorkLogs(
  actor: WorkspaceActor,
  input: GenerateInvoiceFromWorkLogsInput,
) {
  assertActorPermission(actor, 'invoices.manage');
  const client = await getClient(actor, input.clientId);
  const workLogs = await requireInvoiceWorkLogs(
    actor,
    client._id.toString(),
    input.workLogIds,
  );

  const currencies = [...new Set(workLogs.map((workLog) => workLog.currency))];
  if (currencies.length !== 1) {
    throw new ApiError(
      422,
      'Selected work logs must use the same currency to generate one invoice.',
    );
  }

  const items = normalizedItems(
    workLogs.map((workLog) =>
      generatedItemForWorkLog(
        workLog,
        actor.organization.invoiceTimeRoundingMinutes ?? 0,
      ),
    ),
  );
  const totals = calculateTotals(items, input.discount, input.taxRate);
  const invoice = await InvoiceModel.create({
    userId: actor.user._id,
    organizationId: actor.organization._id,
    createdByUserId: actor.user._id,
    clientId: client._id,
    invoiceNumber: await nextInvoiceNumber(actor),
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    currency: currencies[0],
    items,
    ...totals,
    notes:
      input.notes?.trim() ||
      actor.organization.defaultInvoiceNotes ||
      undefined,
    status: input.status,
    ...(input.status === 'paid' ? { paidAt: new Date() } : {}),
  });

  await syncInvoiceWorkLogs(
    actor,
    invoice._id.toString(),
    client._id.toString(),
    input.workLogIds,
  );

  return toInvoiceContract(invoice, invoiceClient(client));
}

export async function getInvoice(actor: WorkspaceActor, invoiceId: string) {
  assertActorPermission(actor, 'invoices.view');
  assertActorPermission(actor, 'financials.view');
  requireValidInvoiceId(invoiceId);
  const invoice = await InvoiceModel.findOne({
    _id: invoiceId,
    organizationId: actor.organization._id,
  });

  if (!invoice) {
    throw new ApiError(404, 'Invoice not found.');
  }

  const client = await getClient(actor, invoice.clientId.toString());
  return { invoice, client };
}

export async function updateInvoice(
  actor: WorkspaceActor,
  invoiceId: string,
  input: UpdateInvoiceInput,
) {
  assertActorPermission(actor, 'invoices.manage');
  requireValidInvoiceId(invoiceId);
  const currentInvoice = await InvoiceModel.findOne({
    _id: invoiceId,
    organizationId: actor.organization._id,
  });

  if (!currentInvoice) {
    throw new ApiError(404, 'Invoice not found.');
  }

  const nextStatus = input.status ?? currentInvoice.status;
  const nextItems =
    input.items?.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      ...(item.workLogId ? { workLogId: item.workLogId } : {}),
    })) ??
    currentInvoice.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      ...(item.workLogId ? { workLogId: item.workLogId.toString() } : {}),
    }));

  const { client, payload, workLogIds } = await payloadForManualInvoice(actor, {
    clientId: input.clientId ?? currentInvoice.clientId.toString(),
    issueDate: input.issueDate ?? currentInvoice.issueDate,
    dueDate: input.dueDate ?? currentInvoice.dueDate,
    currency: input.currency ?? currentInvoice.currency,
    items: nextItems,
    discount: input.discount ?? currentInvoice.discount,
    taxRate: input.taxRate ?? currentInvoice.taxRate,
    notes: input.notes === undefined ? currentInvoice.notes : input.notes,
    status: nextStatus,
    currentInvoiceId: currentInvoice._id.toString(),
  });

  const updatePayload: Record<string, unknown> = { ...payload };
  const unsetPayload: Record<string, 1> = {};

  if (nextStatus === 'paid') {
    updatePayload.paidAt = currentInvoice.paidAt ?? new Date();
  } else {
    unsetPayload.paidAt = 1;
  }

  const invoice = await InvoiceModel.findOneAndUpdate(
    { _id: invoiceId, organizationId: actor.organization._id },
    {
      $set: updatePayload,
      ...(Object.keys(unsetPayload).length > 0 ? { $unset: unsetPayload } : {}),
    },
    { new: true, runValidators: true },
  );

  if (!invoice) {
    throw new ApiError(404, 'Invoice not found.');
  }

  await syncInvoiceWorkLogs(
    actor,
    invoice._id.toString(),
    client._id.toString(),
    workLogIds,
  );

  return toInvoiceContract(invoice, invoiceClient(client));
}

export async function markInvoicePaid(
  actor: WorkspaceActor,
  invoiceId: string,
) {
  assertActorPermission(actor, 'invoices.manage');
  requireValidInvoiceId(invoiceId);
  const invoice = await InvoiceModel.findOneAndUpdate(
    { _id: invoiceId, organizationId: actor.organization._id },
    { $set: { status: 'paid', paidAt: new Date() } },
    { new: true, runValidators: true },
  );

  const contract = await contractForInvoice(invoice);
  if (!contract) {
    throw new ApiError(404, 'Invoice not found.');
  }

  return contract;
}

export async function deleteInvoice(actor: WorkspaceActor, invoiceId: string) {
  assertActorPermission(actor, 'invoices.manage');
  requireValidInvoiceId(invoiceId);
  const invoice = await InvoiceModel.findOneAndDelete({
    _id: invoiceId,
    organizationId: actor.organization._id,
  });

  if (!invoice) {
    throw new ApiError(404, 'Invoice not found.');
  }

  await WorkLogModel.updateMany(
    {
      invoiceId: invoice._id,
      organizationId: actor.organization._id,
    },
    { $unset: { invoiceId: 1 } },
  );
}
