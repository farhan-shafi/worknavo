import { z } from 'zod';

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.string().trim().max(maximum).optional(),
  );

const optionalDate = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.date().optional(),
);

const tagsSchema = z.preprocess(
  (value) => {
    if (!Array.isArray(value)) {
      return undefined;
    }

    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean);
  },
  z.array(z.string().min(1).max(30)).max(8).optional(),
);

const booleanField = z.preprocess((value) => {
  if (value === true || value === false) {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value;
}, z.boolean());

const locationProofSchema = z
  .object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    accuracy: z.coerce.number().min(0).nullable().optional(),
    capturedAt: z.coerce.date().default(() => new Date()),
  })
  .optional();

const workLogFields = {
  clientId: z.string().trim().min(1, 'Select a client.'),
  projectId: z.string().trim().min(1, 'Select a project.'),
  title: z.string().trim().min(2, 'Work summary is required.').max(140),
  description: optionalText(4000),
  category: optionalText(60),
  categoryId: optionalText(80),
  tags: tagsSchema,
  workDate: z.coerce.date(),
  durationHours: z.coerce.number().gt(0).max(24),
  billable: booleanField,
};

export const createWorkLogSchema = z.object({
  ...workLogFields,
  billable: booleanField.default(true),
});

export const updateWorkLogSchema = z.object(workLogFields).partial();

export const startWorkLogTimerSchema = z.object({
  clientId: z.string().trim().min(1, 'Select a client.'),
  projectId: z.string().trim().min(1, 'Select a project.'),
  title: z.string().trim().min(2, 'Work summary is required.').max(140),
  description: optionalText(4000),
  category: optionalText(60),
  categoryId: optionalText(80),
  tags: tagsSchema,
  billable: booleanField.default(true),
  locationProof: locationProofSchema,
});

export const stopWorkLogTimerSchema = z.object({
  locationProof: locationProofSchema,
});

export const listWorkLogsQuerySchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    billable: z
      .union([
        z.literal('all'),
        z.literal('billable'),
        z.literal('non-billable'),
      ])
      .default('all'),
    clientId: z.string().trim().optional(),
    projectId: z.string().trim().optional(),
    membershipId: z.string().trim().optional(),
    categoryId: z.string().trim().optional(),
    startDate: optionalDate,
    endDate: optionalDate,
  })
  .superRefine((value, context) => {
    if (
      value.startDate &&
      value.endDate &&
      value.endDate.getTime() < value.startDate.getTime()
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date must be on or after the start date.',
      });
    }
  });

export const rejectWorkLogApprovalSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
});

export const createScreenshotProofSchema = z.object({
  imageDataUrl: z
    .string()
    .regex(
      /^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/=]+$/,
      'Upload a PNG or JPEG screenshot proof.',
    ),
  capturedAt: z.coerce.date().default(() => new Date()),
});

export type CreateWorkLogInput = z.infer<typeof createWorkLogSchema>;
export type UpdateWorkLogInput = z.infer<typeof updateWorkLogSchema>;
export type StartWorkLogTimerInput = z.infer<typeof startWorkLogTimerSchema>;
export type StopWorkLogTimerInput = z.infer<typeof stopWorkLogTimerSchema>;
export type RejectWorkLogApprovalInput = z.infer<
  typeof rejectWorkLogApprovalSchema
>;
export type CreateScreenshotProofInput = z.infer<
  typeof createScreenshotProofSchema
>;
