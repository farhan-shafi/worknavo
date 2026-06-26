import type { AuthUser, Currency, UserRole } from '@clientflow/shared';
import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface User {
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  role: UserRole;
  businessName?: string;
  businessAddress?: string;
  defaultCurrency: Currency;
  defaultHourlyRate?: number;
  invoicePrefix: string;
  defaultInvoiceNotes?: string;
  lastActiveOrganizationId?: Types.ObjectId;
  forcePasswordChange: boolean;
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;

const userSchema = new Schema<User>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    businessName: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    businessAddress: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    defaultCurrency: {
      type: String,
      enum: ['USD', 'PKR', 'GBP', 'EUR'],
      default: 'USD',
    },
    defaultHourlyRate: {
      type: Number,
      min: 0,
    },
    invoicePrefix: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 12,
      default: 'INV',
    },
    defaultInvoiceNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    lastActiveOrganizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    forcePasswordChange: { type: Boolean, default: false },
    passwordResetTokenHash: {
      type: String,
      select: false,
      index: true,
    },
    passwordResetExpiresAt: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.set('toJSON', {
  transform: (_document, returnedObject) => {
    const safeObject = returnedObject as unknown as Record<string, unknown>;
    delete safeObject.passwordHash;
    delete safeObject.__v;
    return safeObject;
  },
});

export const UserModel = model<User>('User', userSchema);

export function toAuthUser(user: UserDocument): AuthUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    businessName: user.businessName ?? null,
    businessAddress: user.businessAddress ?? null,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role,
    defaultCurrency: user.defaultCurrency,
    defaultHourlyRate: user.defaultHourlyRate ?? null,
    invoicePrefix: user.invoicePrefix || 'INV',
    defaultInvoiceNotes: user.defaultInvoiceNotes ?? null,
    forcePasswordChange: user.forcePasswordChange,
    createdAt: user.createdAt.toISOString(),
  };
}
