import { z } from 'zod';

const role = z.enum([
  'admin',
  'project_manager',
  'finance',
  'member',
  'viewer',
]);
const permission = z.string().trim().min(1);

export const updateMemberSchema = z.object({
  role: role.optional(),
  jobTitle: z.string().trim().max(100).nullish(),
  reportingManagerId: z.string().trim().nullish(),
  weeklyCapacity: z.coerce.number().min(1).max(168).optional(),
  permissionOverrides: z
    .object({
      allow: z.array(permission).default([]),
      deny: z.array(permission).default([]),
    })
    .optional(),
});

export const inviteMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  name: z.string().trim().min(2).max(80).optional(),
  role: role.default('member'),
  jobTitle: z.string().trim().max(100).optional(),
  mode: z.enum(['email', 'admin_created']).default('email'),
  projectIds: z.array(z.string().trim().min(1)).default([]),
  permissionOverrides: z
    .object({
      allow: z.array(permission).default([]),
      deny: z.array(permission).default([]),
    })
    .default({ allow: [], deny: [] }),
});

export const assignProjectsSchema = z.object({
  assignments: z.array(
    z.object({
      projectId: z.string().trim().min(1),
      assignmentType: z
        .enum(['project_manager', 'contributor'])
        .default('contributor'),
      categoryIds: z.array(z.string().trim().min(1)).default([]),
    }),
  ),
});
