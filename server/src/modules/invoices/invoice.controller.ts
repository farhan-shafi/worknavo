import type {
  InvoiceListResponse,
  InvoiceResponse,
  MessageResponse,
} from '@clientflow/shared';
import type { Request, Response } from 'express';

import { toInvoiceContract } from '../../models/Invoice.model.js';
import { ApiError } from '../../utils/api-error.js';
import { workspaceActor } from '../../auth/workspace-context.js';
import { createInvoicePdf, pdfFilename } from '../../utils/pdf-generator.js';
import { sendDocumentEmail } from '../email/email.service.js';
import { invoiceEmailTemplate } from '../email/email.templates.js';
import {
  createInvoice as createInvoiceService,
  deleteInvoice as deleteInvoiceService,
  generateInvoiceFromWorkLogs as generateInvoiceFromWorkLogsService,
  getInvoice,
  listInvoices as listInvoicesService,
  markInvoicePaid as markInvoicePaidService,
  updateInvoice as updateInvoiceService,
} from './invoice.service.js';
import {
  createInvoiceSchema,
  generateInvoiceFromWorkLogsSchema,
  listInvoicesQuerySchema,
  updateInvoiceSchema,
} from './invoice.validation.js';

function invoiceId(request: Request) {
  const id = request.params.id;

  if (typeof id !== 'string') {
    throw new ApiError(404, 'Invoice not found.');
  }

  return id;
}

export async function listInvoices(request: Request, response: Response) {
  const filters = listInvoicesQuerySchema.parse(request.query);
  const body: InvoiceListResponse = await listInvoicesService(
    workspaceActor(request),
    filters,
  );
  response.status(200).json(body);
}

export async function createInvoice(request: Request, response: Response) {
  const input = createInvoiceSchema.parse(request.body);
  const invoice = await createInvoiceService(workspaceActor(request), input);
  const body: InvoiceResponse = {
    message: 'Invoice created successfully.',
    invoice,
  };
  response.status(201).json(body);
}

export async function generateInvoiceFromWorkLogs(
  request: Request,
  response: Response,
) {
  const input = generateInvoiceFromWorkLogsSchema.parse(request.body);
  const invoice = await generateInvoiceFromWorkLogsService(
    workspaceActor(request),
    input,
  );
  const body: InvoiceResponse = {
    message: 'Invoice generated successfully.',
    invoice,
  };
  response.status(201).json(body);
}

export async function showInvoice(request: Request, response: Response) {
  const { invoice, client } = await getInvoice(
    workspaceActor(request),
    invoiceId(request),
  );
  const body: InvoiceResponse = {
    invoice: toInvoiceContract(invoice, {
      id: client._id.toString(),
      name: client.name,
      companyName: client.companyName ?? null,
    }),
  };
  response.status(200).json(body);
}

export async function downloadInvoice(request: Request, response: Response) {
  const actor = workspaceActor(request);
  const { invoice, client } = await getInvoice(actor, invoiceId(request));
  const pdf = await createInvoicePdf({
    client,
    invoice,
    organization: actor.organization,
  });

  response
    .status(200)
    .set({
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename="${pdfFilename(invoice.invoiceNumber)}"`,
      'Content-Length': String(pdf.length),
      'Content-Type': 'application/pdf',
    })
    .send(pdf);
}

export async function emailInvoice(request: Request, response: Response) {
  const actor = workspaceActor(request);
  const user = actor.user;
  const { invoice, client } = await getInvoice(actor, invoiceId(request));
  const pdf = await createInvoicePdf({
    client,
    invoice,
    organization: actor.organization,
  });
  const template = invoiceEmailTemplate({
    client,
    invoice,
    organization: actor.organization,
  });

  await sendDocumentEmail({
    user,
    organization: actor.organization,
    membership: actor.membership,
    client,
    documentId: invoice._id.toString(),
    documentType: 'invoice',
    ...template,
    filename: pdfFilename(invoice.invoiceNumber),
    pdf,
  });

  const body: MessageResponse = {
    message: `Invoice emailed to ${client.email}.`,
  };
  response.status(200).json(body);
}

export async function updateInvoice(request: Request, response: Response) {
  const input = updateInvoiceSchema.parse(request.body);

  if (Object.keys(input).length === 0) {
    throw new ApiError(422, 'Provide at least one invoice field to update.');
  }

  const invoice = await updateInvoiceService(
    workspaceActor(request),
    invoiceId(request),
    input,
  );
  const body: InvoiceResponse = {
    message: 'Invoice updated successfully.',
    invoice,
  };
  response.status(200).json(body);
}

export async function markInvoicePaid(request: Request, response: Response) {
  const invoice = await markInvoicePaidService(
    workspaceActor(request),
    invoiceId(request),
  );
  const body: InvoiceResponse = {
    message: 'Invoice marked as paid.',
    invoice,
  };
  response.status(200).json(body);
}

export async function deleteInvoice(request: Request, response: Response) {
  await deleteInvoiceService(workspaceActor(request), invoiceId(request));
  const body: MessageResponse = { message: 'Invoice deleted successfully.' };
  response.status(200).json(body);
}
