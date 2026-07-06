import type {
  Currency,
  Invoice as InvoiceContract,
  InvoiceClient,
  InvoiceStatus,
} from '@clientflow/shared';
import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  workLogId?: Types.ObjectId;
  expenseId?: Types.ObjectId;
}

export interface Invoice {
  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
  createdByUserId: Types.ObjectId;
  clientId: Types.ObjectId;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  currency: Currency;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string;
  status: InvoiceStatus;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type InvoiceDocument = HydratedDocument<Invoice>;

const invoiceItemSchema = new Schema<InvoiceItem>(
  {
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 400,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.01,
      max: 10_000,
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
      max: 1_000_000,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      max: 1_000_000_000,
    },
    workLogId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkLog',
    },
    expenseId: {
      type: Schema.Types.ObjectId,
      ref: 'Expense',
    },
  },
  { _id: false },
);

const invoiceSchema = new Schema<Invoice>(
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
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    issueDate: {
      type: Date,
      required: true,
      index: true,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    currency: {
      type: String,
      enum: ['USD', 'PKR', 'GBP', 'EUR'],
      required: true,
    },
    items: {
      type: [invoiceItemSchema],
      default: [],
      validate: {
        validator: (value: InvoiceItem[]) =>
          value.length > 0 && value.length <= 50,
        message: 'Invoices must include between 1 and 50 items.',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      required: true,
      min: 0,
    },
    taxRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    taxAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 4000,
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
      default: 'draft',
      required: true,
      index: true,
    },
    paidAt: Date,
  },
  {
    timestamps: true,
  },
);

invoiceSchema.index(
  { organizationId: 1, invoiceNumber: 1 },
  { unique: true, sparse: true },
);
invoiceSchema.index({ organizationId: 1, status: 1, updatedAt: -1 });
invoiceSchema.index({ userId: 1, clientId: 1, issueDate: -1 });
invoiceSchema.index({ userId: 1, status: 1, updatedAt: -1 });

export const InvoiceModel = model<Invoice>('Invoice', invoiceSchema);

export function toInvoiceContract(
  invoice: InvoiceDocument,
  client: InvoiceClient,
): InvoiceContract {
  return {
    id: invoice._id.toString(),
    clientId: invoice.clientId.toString(),
    client,
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    currency: invoice.currency,
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount,
      workLogId: item.workLogId?.toString() ?? null,
      expenseId: item.expenseId?.toString() ?? null,
    })),
    subtotal: invoice.subtotal,
    discount: invoice.discount,
    taxRate: invoice.taxRate,
    taxAmount: invoice.taxAmount,
    total: invoice.total,
    notes: invoice.notes ?? null,
    status: invoice.status,
    paidAt: invoice.paidAt?.toISOString() ?? null,
    linkedWorkLogCount: invoice.items.filter((item) => item.workLogId).length,
    linkedExpenseCount: invoice.items.filter((item) => item.expenseId).length,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}
