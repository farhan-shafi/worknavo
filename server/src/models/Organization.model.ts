import type {
  Currency,
  Organization as OrganizationContract,
  WorkspaceType,
} from '@clientflow/shared';
import { Schema, model, type HydratedDocument } from 'mongoose';

export interface Organization {
  name: string;
  slug: string;
  workspaceType: WorkspaceType;
  businessEmail?: string;
  businessAddress?: string;
  website?: string;
  defaultCurrency: Currency;
  defaultHourlyRate?: number;
  invoicePrefix: string;
  defaultInvoiceNotes?: string;
  timezone: string;
  weekStartsOn: number;
  defaultWeeklyCapacity: number;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export type OrganizationDocument = HydratedDocument<Organization>;

const organizationSchema = new Schema<Organization>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 80,
      index: true,
    },
    workspaceType: {
      type: String,
      enum: ['solo', 'company'],
      default: 'solo',
      required: true,
    },
    businessEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    businessAddress: { type: String, trim: true, maxlength: 500 },
    website: { type: String, trim: true, maxlength: 300 },
    defaultCurrency: {
      type: String,
      enum: ['USD', 'PKR', 'GBP', 'EUR'],
      default: 'USD',
      required: true,
    },
    defaultHourlyRate: { type: Number, min: 0, max: 1_000_000 },
    invoicePrefix: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 12,
      default: 'INV',
    },
    defaultInvoiceNotes: { type: String, trim: true, maxlength: 2000 },
    timezone: { type: String, trim: true, default: 'UTC', maxlength: 100 },
    weekStartsOn: { type: Number, min: 0, max: 6, default: 1 },
    defaultWeeklyCapacity: { type: Number, min: 1, max: 168, default: 40 },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

export const OrganizationModel = model<Organization>(
  'Organization',
  organizationSchema,
);

export function toOrganizationContract(
  organization: OrganizationDocument,
): OrganizationContract {
  return {
    id: organization._id.toString(),
    name: organization.name,
    slug: organization.slug,
    workspaceType: organization.workspaceType,
    businessEmail: organization.businessEmail ?? null,
    businessAddress: organization.businessAddress ?? null,
    website: organization.website ?? null,
    defaultCurrency: organization.defaultCurrency,
    defaultHourlyRate: organization.defaultHourlyRate ?? null,
    invoicePrefix: organization.invoicePrefix || 'INV',
    defaultInvoiceNotes: organization.defaultInvoiceNotes ?? null,
    timezone: organization.timezone,
    weekStartsOn: organization.weekStartsOn,
    defaultWeeklyCapacity: organization.defaultWeeklyCapacity,
    status: organization.status,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
  };
}
