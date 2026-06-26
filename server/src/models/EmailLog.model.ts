import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export type EmailDocumentType = 'invoice' | 'report';
export type EmailDeliveryStatus = 'failed' | 'pending' | 'sent';

export interface EmailLog {
  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
  createdByUserId: Types.ObjectId;
  clientId: Types.ObjectId;
  documentId: Types.ObjectId;
  documentType: EmailDocumentType;
  recipient: string;
  subject: string;
  status: EmailDeliveryStatus;
  providerMessageId?: string;
  errorMessage?: string;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type EmailLogDocument = HydratedDocument<EmailLog>;

const emailLogSchema = new Schema<EmailLog>(
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
    documentId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    documentType: {
      type: String,
      enum: ['invoice', 'report'],
      required: true,
      index: true,
    },
    recipient: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
      required: true,
      index: true,
    },
    providerMessageId: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    errorMessage: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    sentAt: Date,
  },
  { timestamps: true },
);

emailLogSchema.index({ userId: 1, createdAt: -1 });
emailLogSchema.index({ userId: 1, documentType: 1, documentId: 1 });

export const EmailLogModel = model<EmailLog>('EmailLog', emailLogSchema);
