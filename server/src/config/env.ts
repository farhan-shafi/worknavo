import 'dotenv/config';

import { z } from 'zod';

const optionalEnvironmentString = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().trim().min(1).optional(),
);

const environmentSchema = z.object({
  CLIENT_URL: z
    .string()
    .trim()
    .url()
    .default('http://localhost:5173')
    .transform((value) => new URL(value).origin),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32)
    .default('development-access-secret-change-me-now'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32)
    .default('development-refresh-secret-change-me-now'),
  MONGO_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/clientflow'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(5050),
  RESEND_API_KEY: optionalEnvironmentString,
  SMTP_FROM: optionalEnvironmentString,
  SMTP_FROM_NAME: optionalEnvironmentString.default('ClientFlow'),
  SMTP_HOST: optionalEnvironmentString,
  SMTP_PASS: optionalEnvironmentString,
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: optionalEnvironmentString,
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  console.error(
    'Invalid environment variables:',
    parsedEnvironment.error.flatten().fieldErrors,
  );
  throw new Error('Invalid server environment configuration.');
}

if (
  parsedEnvironment.data.NODE_ENV === 'production' &&
  (parsedEnvironment.data.JWT_ACCESS_SECRET.startsWith('development-') ||
    parsedEnvironment.data.JWT_REFRESH_SECRET.startsWith('development-'))
) {
  throw new Error('Production JWT secrets must be configured.');
}

export const env = parsedEnvironment.data;
