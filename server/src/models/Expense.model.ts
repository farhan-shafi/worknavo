import type { Currency, Expense as ExpenseContract } from '@clientflow/shared';
import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

import type { ClientDocument } from './Client.model.js';
import type { ProjectDocument } from './Project.model.js';

export interface Expense {
  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
  createdByUserId: Types.ObjectId;
  membershipId: Types.ObjectId;
  clientId: Types.ObjectId;
  projectId?: Types.ObjectId;
  invoiceId?: Types.ObjectId;
  description: string;
  category?: string;
  expenseDate: Date;
  amount: number;
  currency: Currency;
  billable: boolean;
  receiptUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ExpenseDocument = HydratedDocument<Expense>;

const expenseSchema = new Schema<Expense>(
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
      required: true,
      index: true,
    },
    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    membershipId: {
      type: Schema.Types.ObjectId,
      ref: 'OrganizationMembership',
      required: true,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      index: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    category: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    expenseDate: {
      type: Date,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
      max: 1_000_000_000,
    },
    currency: {
      type: String,
      enum: ['USD', 'PKR', 'GBP', 'EUR'],
      required: true,
    },
    billable: {
      type: Boolean,
      default: true,
      required: true,
      index: true,
    },
    receiptUrl: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
  },
  { timestamps: true },
);

expenseSchema.index({ organizationId: 1, expenseDate: -1, updatedAt: -1 });
expenseSchema.index({ organizationId: 1, clientId: 1, expenseDate: -1 });
expenseSchema.index({ organizationId: 1, projectId: 1, expenseDate: -1 });
expenseSchema.index({ organizationId: 1, invoiceId: 1 });

export const ExpenseModel = model<Expense>('Expense', expenseSchema);

export function toExpenseContract(
  expense: ExpenseDocument,
  client: ClientDocument,
  project?: ProjectDocument | null,
): ExpenseContract {
  return {
    id: expense._id.toString(),
    clientId: expense.clientId.toString(),
    projectId: expense.projectId?.toString() ?? null,
    invoiceId: expense.invoiceId?.toString() ?? null,
    client: {
      id: client._id.toString(),
      name: client.name,
      companyName: client.companyName ?? null,
    },
    project: project
      ? {
          id: project._id.toString(),
          name: project.name,
          companyName: null,
        }
      : null,
    description: expense.description,
    category: expense.category ?? null,
    expenseDate: expense.expenseDate.toISOString(),
    amount: expense.amount,
    currency: expense.currency,
    billable: expense.billable,
    receiptUrl: expense.receiptUrl ?? null,
    notes: expense.notes ?? null,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
}
