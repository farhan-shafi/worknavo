import type { ScreenshotProof as ScreenshotProofContract } from '@clientflow/shared';
import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface ScreenshotProof {
  organizationId: Types.ObjectId;
  workLogId: Types.ObjectId;
  membershipId: Types.ObjectId;
  createdByUserId: Types.ObjectId;
  capturedAt: Date;
  mimeType: 'image/jpeg' | 'image/png';
  fileSize: number;
  storagePath: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ScreenshotProofDocument = HydratedDocument<ScreenshotProof>;

const screenshotProofSchema = new Schema<ScreenshotProof>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    workLogId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkLog',
      required: true,
      index: true,
    },
    membershipId: {
      type: Schema.Types.ObjectId,
      ref: 'OrganizationMembership',
      required: true,
      index: true,
    },
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    capturedAt: { type: Date, required: true, index: true },
    mimeType: {
      type: String,
      enum: ['image/jpeg', 'image/png'],
      required: true,
    },
    fileSize: { type: Number, required: true, min: 1, max: 850_000 },
    storagePath: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

screenshotProofSchema.index({
  organizationId: 1,
  workLogId: 1,
  capturedAt: -1,
});

export const ScreenshotProofModel = model<ScreenshotProof>(
  'ScreenshotProof',
  screenshotProofSchema,
);

export function toScreenshotProofContract(
  proof: ScreenshotProofDocument,
): ScreenshotProofContract {
  const workLogId = proof.workLogId.toString();
  return {
    id: proof._id.toString(),
    workLogId,
    capturedAt: proof.capturedAt.toISOString(),
    mimeType: proof.mimeType,
    fileSize: proof.fileSize,
    fileUrl: `/api/work-logs/${workLogId}/screenshot-proofs/${proof._id.toString()}/file`,
    createdAt: proof.createdAt.toISOString(),
  };
}
