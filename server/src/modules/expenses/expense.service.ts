import type {
  ExpenseBillableFilter,
  ExpenseInvoiceFilter,
} from '@clientflow/shared';
import { isValidObjectId, type FilterQuery } from 'mongoose';

import {
  actorHas,
  assertActorPermission,
  type WorkspaceActor,
} from '../../auth/workspace-context.js';
import { ClientModel, type ClientDocument } from '../../models/Client.model.js';
import {
  ExpenseModel,
  toExpenseContract,
  type Expense,
  type ExpenseDocument,
} from '../../models/Expense.model.js';
import { ProjectModel } from '../../models/Project.model.js';
import { ApiError } from '../../utils/api-error.js';
import type {
  CreateExpenseInput,
  UpdateExpenseInput,
} from './expense.validation.js';

function requireValidExpenseId(expenseId: string) {
  if (!isValidObjectId(expenseId)) {
    throw new ApiError(404, 'Expense not found.');
  }
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

async function requireClient(actor: WorkspaceActor, clientId: string) {
  if (!isValidObjectId(clientId)) {
    throw new ApiError(422, 'Select a valid client.');
  }

  const client = await ClientModel.findOne({
    _id: clientId,
    organizationId: actor.organization._id,
  });

  if (!client) {
    throw new ApiError(422, 'Select a client from your workspace.');
  }

  return client;
}

async function requireProject(
  actor: WorkspaceActor,
  projectId: string | undefined,
  client: ClientDocument,
) {
  if (!projectId) {
    return null;
  }

  if (!isValidObjectId(projectId)) {
    throw new ApiError(422, 'Select a valid project.');
  }

  const project = await ProjectModel.findOne({
    _id: projectId,
    organizationId: actor.organization._id,
  });

  if (!project) {
    throw new ApiError(422, 'Select a project from your workspace.');
  }

  if (project.clientId.toString() !== client._id.toString()) {
    throw new ApiError(
      422,
      'Select a project that belongs to the chosen client.',
    );
  }

  return project;
}

async function contractsForExpenses(expenses: ExpenseDocument[]) {
  const clientIds = [
    ...new Set(expenses.map((expense) => expense.clientId.toString())),
  ];
  const projectIds = [
    ...new Set(
      expenses.flatMap((expense) =>
        expense.projectId ? [expense.projectId.toString()] : [],
      ),
    ),
  ];
  const [clients, projects] = await Promise.all([
    ClientModel.find({ _id: { $in: clientIds } }),
    ProjectModel.find({ _id: { $in: projectIds } }),
  ]);
  const clientsById = new Map(
    clients.map((client) => [client._id.toString(), client]),
  );
  const projectsById = new Map(
    projects.map((project) => [project._id.toString(), project]),
  );

  return expenses.flatMap((expense) => {
    const client = clientsById.get(expense.clientId.toString());
    const project = expense.projectId
      ? projectsById.get(expense.projectId.toString())
      : null;
    return client ? [toExpenseContract(expense, client, project)] : [];
  });
}

function baseQuery(
  actor: WorkspaceActor,
  filters: {
    clientId?: string;
    projectId?: string;
    billable: ExpenseBillableFilter;
    invoice: ExpenseInvoiceFilter;
    startDate?: Date;
    endDate?: Date;
  },
): FilterQuery<Expense> {
  const query: FilterQuery<Expense> = {
    organizationId: actor.organization._id,
  };

  if (filters.clientId) {
    if (!isValidObjectId(filters.clientId)) {
      throw new ApiError(422, 'Select a valid client filter.');
    }
    query.clientId = filters.clientId;
  }

  if (filters.projectId) {
    if (!isValidObjectId(filters.projectId)) {
      throw new ApiError(422, 'Select a valid project filter.');
    }
    query.projectId = filters.projectId;
  }

  if (filters.billable === 'billable') {
    query.billable = true;
  } else if (filters.billable === 'non-billable') {
    query.billable = false;
  }

  if (filters.invoice === 'uninvoiced') {
    query.invoiceId = { $exists: false };
  } else if (filters.invoice === 'invoiced') {
    query.invoiceId = { $exists: true };
  }

  if (filters.startDate || filters.endDate) {
    query.expenseDate = {};
    if (filters.startDate)
      query.expenseDate.$gte = startOfDay(filters.startDate);
    if (filters.endDate) query.expenseDate.$lte = endOfDay(filters.endDate);
  }

  return query;
}

export async function listExpenses(
  actor: WorkspaceActor,
  filters: {
    clientId?: string;
    projectId?: string;
    billable: ExpenseBillableFilter;
    invoice: ExpenseInvoiceFilter;
    startDate?: Date;
    endDate?: Date;
  },
) {
  assertActorPermission(actor, 'financials.view');
  const query = baseQuery(actor, filters);
  const expenses = await ExpenseModel.find(query).sort({
    expenseDate: -1,
    updatedAt: -1,
  });
  const contracts = await contractsForExpenses(expenses);
  const summary = contracts.reduce(
    (totals, expense) => {
      totals.totalAmount += expense.amount;
      if (expense.billable) {
        totals.billableAmount += expense.amount;
        if (!expense.invoiceId) {
          totals.uninvoicedBillableAmount += expense.amount;
        }
      }
      return totals;
    },
    { totalAmount: 0, billableAmount: 0, uninvoicedBillableAmount: 0 },
  );

  return {
    expenses: contracts,
    total: contracts.length,
    summary,
  };
}

export async function createExpense(
  actor: WorkspaceActor,
  input: CreateExpenseInput,
) {
  assertActorPermission(actor, 'invoices.manage');
  const client = await requireClient(actor, input.clientId);
  const project = await requireProject(actor, input.projectId, client);
  const expense = await ExpenseModel.create({
    ...input,
    userId: actor.user._id,
    organizationId: actor.organization._id,
    createdByUserId: actor.user._id,
    membershipId: actor.membership._id,
    clientId: client._id,
    ...(project ? { projectId: project._id } : {}),
  });

  return toExpenseContract(expense, client, project);
}

export async function getExpense(actor: WorkspaceActor, expenseId: string) {
  assertActorPermission(actor, 'financials.view');
  requireValidExpenseId(expenseId);
  const expense = await ExpenseModel.findOne({
    _id: expenseId,
    organizationId: actor.organization._id,
  });

  if (!expense) {
    throw new ApiError(404, 'Expense not found.');
  }

  const [client, project] = await Promise.all([
    ClientModel.findById(expense.clientId),
    expense.projectId ? ProjectModel.findById(expense.projectId) : null,
  ]);

  if (!client) {
    throw new ApiError(404, 'Expense client not found.');
  }

  return { expense, contract: toExpenseContract(expense, client, project) };
}

export async function updateExpense(
  actor: WorkspaceActor,
  expenseId: string,
  input: UpdateExpenseInput,
) {
  assertActorPermission(actor, 'invoices.manage');
  const { expense } = await getExpense(actor, expenseId);

  if (expense.invoiceId && !actorHas(actor, 'worklogs.manageAll')) {
    throw new ApiError(
      409,
      'This expense is linked to an invoice and cannot be edited.',
    );
  }

  const client = await requireClient(
    actor,
    input.clientId ?? expense.clientId.toString(),
  );
  const project = await requireProject(
    actor,
    input.projectId ?? expense.projectId?.toString(),
    client,
  );
  const setFields: Record<string, unknown> = {
    clientId: client._id,
    ...(project ? { projectId: project._id } : {}),
  };
  const unsetFields: Record<string, 1> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) {
      if (
        key === 'projectId' ||
        key === 'category' ||
        key === 'receiptUrl' ||
        key === 'notes'
      ) {
        unsetFields[key] = 1;
      }
    } else {
      setFields[key] = value;
    }
  }

  const updated = await ExpenseModel.findOneAndUpdate(
    { _id: expenseId, organizationId: actor.organization._id },
    {
      $set: setFields,
      ...(Object.keys(unsetFields).length > 0 ? { $unset: unsetFields } : {}),
    },
    { new: true, runValidators: true },
  );

  if (!updated) {
    throw new ApiError(404, 'Expense not found.');
  }

  return toExpenseContract(updated, client, project);
}

export async function deleteExpense(actor: WorkspaceActor, expenseId: string) {
  assertActorPermission(actor, 'invoices.manage');
  const { expense } = await getExpense(actor, expenseId);

  if (expense.invoiceId) {
    throw new ApiError(
      409,
      'This expense is linked to an invoice and cannot be deleted.',
    );
  }

  await ExpenseModel.deleteOne({
    _id: expense._id,
    organizationId: actor.organization._id,
  });
}
