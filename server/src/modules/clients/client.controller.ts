import type {
  ClientListResponse,
  ClientOverviewResponse,
  ClientResponse,
  MessageResponse,
} from '@clientflow/shared';
import type { Request, Response } from 'express';

import { toClientContract } from '../../models/Client.model.js';
import { InvoiceModel } from '../../models/Invoice.model.js';
import { ProjectModel } from '../../models/Project.model.js';
import { WorkLogModel } from '../../models/WorkLog.model.js';
import { ApiError } from '../../utils/api-error.js';
import { workspaceActor } from '../../auth/workspace-context.js';
import {
  createClient as createClientService,
  deleteClient as deleteClientService,
  getClient,
  listClients as listClientsService,
  updateClient as updateClientService,
} from './client.service.js';
import {
  createClientSchema,
  listClientsQuerySchema,
  updateClientSchema,
} from './client.validation.js';

function clientId(request: Request) {
  const id = request.params.id;

  if (typeof id !== 'string') {
    throw new ApiError(404, 'Client not found.');
  }

  return id;
}

export async function listClients(request: Request, response: Response) {
  const filters = listClientsQuerySchema.parse(request.query);
  const body: ClientListResponse = await listClientsService(
    workspaceActor(request),
    filters,
  );
  response.status(200).json(body);
}

export async function createClient(request: Request, response: Response) {
  const input = createClientSchema.parse(request.body);
  const client = await createClientService(workspaceActor(request), input);
  const body: ClientResponse = {
    message: 'Client created successfully.',
    client,
  };
  response.status(201).json(body);
}

export async function showClient(request: Request, response: Response) {
  const client = await getClient(workspaceActor(request), clientId(request));
  const body: ClientResponse = { client: toClientContract(client) };
  response.status(200).json(body);
}

export async function showClientOverview(request: Request, response: Response) {
  const actor = workspaceActor(request);
  const client = await getClient(actor, clientId(request));
  const [activeProjects, totalHoursResult, invoiceTotals, openInvoices] =
    await Promise.all([
      ProjectModel.countDocuments({
        clientId: client._id,
        status: 'active',
        organizationId: actor.organization._id,
      }),
      WorkLogModel.aggregate<{ _id: null; totalHours: number }>([
        {
          $match: {
            clientId: client._id,
            status: { $ne: 'running' },
            organizationId: actor.organization._id,
          },
        },
        {
          $group: {
            _id: null,
            totalHours: { $sum: '$durationHours' },
          },
        },
      ]),
      InvoiceModel.aggregate<{
        _id: null;
        totalBilled: number;
        totalPaid: number;
      }>([
        {
          $match: {
            clientId: client._id,
            organizationId: actor.organization._id,
            status: { $ne: 'cancelled' },
          },
        },
        {
          $group: {
            _id: null,
            totalBilled: { $sum: '$total' },
            totalPaid: {
              $sum: {
                $cond: [{ $eq: ['$status', 'paid'] }, '$total', 0],
              },
            },
          },
        },
      ]),
      InvoiceModel.countDocuments({
        clientId: client._id,
        organizationId: actor.organization._id,
        status: { $in: ['draft', 'sent', 'overdue'] },
      }),
    ]);
  const body: ClientOverviewResponse = {
    client: toClientContract(client, activeProjects),
    metrics: {
      totalBilled: invoiceTotals[0]?.totalBilled ?? 0,
      totalPaid: invoiceTotals[0]?.totalPaid ?? 0,
      openInvoices,
      activeProjects,
      totalHours: totalHoursResult[0]?.totalHours ?? 0,
    },
  };
  response.status(200).json(body);
}

export async function updateClient(request: Request, response: Response) {
  const input = updateClientSchema.parse(request.body);

  if (Object.keys(input).length === 0) {
    throw new ApiError(422, 'Provide at least one client field to update.');
  }

  const client = await updateClientService(
    workspaceActor(request),
    clientId(request),
    input,
  );
  const body: ClientResponse = {
    message: 'Client updated successfully.',
    client,
  };
  response.status(200).json(body);
}

export async function deleteClient(request: Request, response: Response) {
  await deleteClientService(workspaceActor(request), clientId(request));
  const body: MessageResponse = { message: 'Client deleted successfully.' };
  response.status(200).json(body);
}
