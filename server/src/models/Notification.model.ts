import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface Notification {
  organizationId: Types.ObjectId;
  recipientMembershipId: Types.ObjectId;
  type: string;
  title: string;
  message: string;
  targetUrl?: string;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationDocument = HydratedDocument<Notification>;

const notificationSchema = new Schema<Notification>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    recipientMembershipId: {
      type: Schema.Types.ObjectId,
      ref: 'OrganizationMembership',
      required: true,
      index: true,
    },
    type: { type: String, required: true, trim: true, maxlength: 80 },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    targetUrl: { type: String, trim: true, maxlength: 500 },
    readAt: Date,
  },
  { timestamps: true },
);

notificationSchema.index({
  organizationId: 1,
  recipientMembershipId: 1,
  readAt: 1,
  createdAt: -1,
});

export const NotificationModel = model<Notification>(
  'Notification',
  notificationSchema,
);
