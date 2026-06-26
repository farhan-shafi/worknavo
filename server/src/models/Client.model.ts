import type {
  Client as ClientContract,
  ClientStatus,
} from '@clientflow/shared';
import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface Client {
  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
  createdByUserId: Types.ObjectId;
  name: string;
  companyName?: string;
  email: string;
  phone?: string;
  website?: string;
  address?: string;
  status: ClientStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ClientDocument = HydratedDocument<Client>;

const clientSchema = new Schema<Client>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    companyName: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 40,
    },
    website: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'active',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 3000,
    },
  },
  {
    timestamps: true,
  },
);

clientSchema.index(
  { organizationId: 1, email: 1 },
  { unique: true, sparse: true },
);
clientSchema.index({ organizationId: 1, status: 1, updatedAt: -1 });
clientSchema.index({ userId: 1, status: 1, updatedAt: -1 });
clientSchema.index({ userId: 1, name: 1 });

export const ClientModel = model<Client>('Client', clientSchema);

export function toClientContract(
  client: ClientDocument,
  activeProjects = 0,
): ClientContract {
  return {
    id: client._id.toString(),
    name: client.name,
    companyName: client.companyName ?? null,
    email: client.email,
    phone: client.phone ?? null,
    website: client.website ?? null,
    address: client.address ?? null,
    status: client.status,
    notes: client.notes ?? null,
    activeProjects,
    unpaidAmount: 0,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  };
}
