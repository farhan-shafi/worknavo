import type { ClientStatus } from '@clientflow/shared';
import { isValidObjectId, type FilterQuery } from 'mongoose';

import {
  ClientModel,
  toClientContract,
  type Client,
} from '../../models/Client.model.js';
import { InvoiceModel } from '../../models/Invoice.model.js';
import { WeeklyReportModel } from '../../models/WeeklyReport.model.js';
import { ProjectModel } from '../../models/Project.model.js';
import { ApiError } from '../../utils/api-error.js';
import type { UserDocument } from '../../models/User.model.js';
import {
  assertActorPermission,
  projectVisibilityQuery,
  type WorkspaceActor,
} from '../../auth/workspace-context.js';
import type {
  CreateClientInput,
  UpdateClientInput,
} from './client.validation.js';

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function requireValidClientId(clientId: string) {
  if (!isValidObjectId(clientId)) {
    throw new ApiError(404, 'Client not found.');
  }
}

export async function listClients(
  actor: WorkspaceActor,
  filters: { search?: string; status: ClientStatus | 'all' },
) {
  assertActorPermission(actor, 'clients.view');
  const projectScope = await projectVisibilityQuery(actor);
  const visibleProjectClientIds = await ProjectModel.distinct(
    'clientId',
    projectScope,
  );
  const canSeeAllClients =
    actor.permissions.includes('clients.manage') ||
    actor.permissions.includes('invoices.manage');
  const baseQuery: FilterQuery<Client> = {
    organizationId: actor.organization._id,
    ...(canSeeAllClients ? {} : { _id: { $in: visibleProjectClientIds } }),
  };
  const query: FilterQuery<Client> = { ...baseQuery };

  if (filters.status !== 'all') {
    query.status = filters.status;
  }

  if (filters.search) {
    const search = new RegExp(escapeRegex(filters.search), 'i');
    query.$or = [{ name: search }, { companyName: search }, { email: search }];
  }

  const [clients, statusCounts, activeProjectCounts] = await Promise.all([
    ClientModel.find(query).sort({ updatedAt: -1 }),
    ClientModel.aggregate<{ _id: ClientStatus; count: number }>([
      { $match: baseQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    ProjectModel.aggregate<{ _id: unknown; count: number }>([
      { $match: { ...projectScope, status: 'active' } },
      { $group: { _id: '$clientId', count: { $sum: 1 } } },
    ]),
  ]);
  const activeProjectsByClient = new Map(
    activeProjectCounts.map((entry) => [String(entry._id), entry.count]),
  );

  const counts: Record<ClientStatus | 'all', number> = {
    all: 0,
    active: 0,
    inactive: 0,
    archived: 0,
  };

  for (const entry of statusCounts) {
    counts[entry._id] = entry.count;
    counts.all += entry.count;
  }

  return {
    clients: clients.map((client) =>
      toClientContract(
        client,
        activeProjectsByClient.get(client._id.toString()) ?? 0,
      ),
    ),
    total: clients.length,
    counts,
  };
}

export async function createClient(
  actor: WorkspaceActor,
  input: CreateClientInput,
) {
  assertActorPermission(actor, 'clients.manage');
  const existingClient = await ClientModel.exists({
    organizationId: actor.organization._id,
    email: input.email,
  });

  if (existingClient) {
    throw new ApiError(
      409,
      'A client with this email already exists in your workspace.',
    );
  }

  const client = await ClientModel.create({
    ...input,
    userId: actor.user._id,
    organizationId: actor.organization._id,
    createdByUserId: actor.user._id,
  });

  return toClientContract(client);
}

export async function getClient(
  actorOrUser: WorkspaceActor | UserDocument,
  clientId: string,
) {
  requireValidClientId(clientId);
  if (!('organization' in actorOrUser)) {
    const client = await ClientModel.findOne({
      _id: clientId,
      userId: actorOrUser._id,
    });
    if (!client) throw new ApiError(404, 'Client not found.');
    return client;
  }
  const actor = actorOrUser;
  assertActorPermission(actor, 'clients.view');
  const visibleProjectClientIds = await ProjectModel.distinct(
    'clientId',
    await projectVisibilityQuery(actor),
  );
  const canSeeAllClients =
    actor.permissions.includes('clients.manage') ||
    actor.permissions.includes('invoices.manage');
  const client = await ClientModel.findOne({
    _id: clientId,
    organizationId: actor.organization._id,
    ...(canSeeAllClients ? {} : { _id: { $in: visibleProjectClientIds } }),
  });

  if (!client) {
    throw new ApiError(404, 'Client not found.');
  }

  return client;
}

export async function updateClient(
  actor: WorkspaceActor,
  clientId: string,
  input: UpdateClientInput,
) {
  assertActorPermission(actor, 'clients.manage');
  requireValidClientId(clientId);

  if (input.email) {
    const existingClient = await ClientModel.exists({
      _id: { $ne: clientId },
      organizationId: actor.organization._id,
      email: input.email,
    });

    if (existingClient) {
      throw new ApiError(
        409,
        'A client with this email already exists in your workspace.',
      );
    }
  }

  const client = await ClientModel.findOneAndUpdate(
    { _id: clientId, organizationId: actor.organization._id },
    { $set: input },
    { new: true, runValidators: true },
  );

  if (!client) {
    throw new ApiError(404, 'Client not found.');
  }

  return toClientContract(client);
}

export async function deleteClient(actor: WorkspaceActor, clientId: string) {
  assertActorPermission(actor, 'clients.manage');
  requireValidClientId(clientId);
  const linkedProjects = await ProjectModel.exists({
    clientId,
    organizationId: actor.organization._id,
  });

  if (linkedProjects) {
    throw new ApiError(
      409,
      'Delete or move this client’s projects before deleting the client.',
    );
  }

  const linkedReports = await WeeklyReportModel.exists({
    clientId,
    organizationId: actor.organization._id,
  });

  if (linkedReports) {
    throw new ApiError(
      409,
      'Delete or move this client’s reports before deleting the client.',
    );
  }

  const linkedInvoices = await InvoiceModel.exists({
    clientId,
    organizationId: actor.organization._id,
  });

  if (linkedInvoices) {
    throw new ApiError(
      409,
      'Delete or move this client’s invoices before deleting the client.',
    );
  }

  const client = await ClientModel.findOneAndDelete({
    _id: clientId,
    organizationId: actor.organization._id,
  });

  if (!client) {
    throw new ApiError(404, 'Client not found.');
  }
}
