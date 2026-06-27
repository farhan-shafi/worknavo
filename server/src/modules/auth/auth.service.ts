import { createHash, randomBytes } from 'node:crypto';

import bcrypt from 'bcryptjs';
import jwt, { type JwtPayload } from 'jsonwebtoken';

import { env } from '../../config/env.js';
import {
  toAuthUser,
  UserModel,
  type UserDocument,
} from '../../models/User.model.js';
import { ApiError } from '../../utils/api-error.js';
import {
  createOrganizationForUser,
  ensureUserWorkspace,
} from '../organizations/organization.service.js';
import type {
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateSettingsInput,
} from './auth.validation.js';
import { sendPasswordResetEmail } from '../email/email.service.js';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const REMEMBERED_REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

interface TokenPayload extends JwtPayload {
  sub: string;
  type: 'access' | 'refresh';
  remember?: boolean;
  organizationId?: string;
}

function signToken(
  userId: string,
  type: TokenPayload['type'],
  expiresIn: number,
  extraPayload: Pick<TokenPayload, 'remember'> = {},
  organizationId?: string,
) {
  const secret =
    type === 'access' ? env.JWT_ACCESS_SECRET : env.JWT_REFRESH_SECRET;

  return jwt.sign({ type, ...extraPayload, organizationId }, secret, {
    subject: userId,
    issuer: 'clientflow-api',
    audience: 'clientflow-web',
    expiresIn,
  });
}

function verifyToken(token: string, type: TokenPayload['type']) {
  const secret =
    type === 'access' ? env.JWT_ACCESS_SECRET : env.JWT_REFRESH_SECRET;
  const payload = jwt.verify(token, secret, {
    issuer: 'clientflow-api',
    audience: 'clientflow-web',
  });

  if (
    typeof payload === 'string' ||
    payload.type !== type ||
    typeof payload.sub !== 'string'
  ) {
    throw new ApiError(401, 'Your session is invalid. Please log in again.');
  }

  return payload as TokenPayload;
}

function hashPasswordResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function safeEmailErrorDetails(error: unknown) {
  if (!(error instanceof Error)) {
    return { message: 'Unknown SMTP error.' };
  }

  const maybeSmtpError = error as Error & {
    code?: unknown;
    command?: unknown;
    responseCode?: unknown;
  };

  return {
    code: maybeSmtpError.code,
    command: maybeSmtpError.command,
    message: error.message.slice(0, 500),
    name: error.name,
    responseCode: maybeSmtpError.responseCode,
  };
}

export async function registerUser(input: RegisterInput) {
  const existingUser = await UserModel.exists({ email: input.email });

  if (existingUser) {
    throw new ApiError(409, 'An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await UserModel.create({
    name: input.name,
    email: input.email,
    passwordHash,
    businessName: input.businessName,
  });
  await createOrganizationForUser(user, {
    name: input.businessName,
    workspaceType: input.workspaceType,
  });

  return {
    user,
    publicUser: toAuthUser(user),
  };
}

export async function loginUser(input: LoginInput) {
  const user = await UserModel.findOne({ email: input.email }).select(
    '+passwordHash',
  );

  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new ApiError(401, 'The email or password is incorrect.');
  }

  return {
    user,
    publicUser: toAuthUser(user),
  };
}

export async function requestPasswordReset(email: string) {
  const user = await UserModel.findOne({ email }).select(
    '+passwordResetTokenHash +passwordResetExpiresAt',
  );

  if (!user) {
    return;
  }

  const token = randomBytes(32).toString('hex');
  user.passwordResetTokenHash = hashPasswordResetToken(token);
  user.passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  await user.save();

  try {
    await sendPasswordResetEmail({
      recipient: user.email,
      recipientName: user.name,
      resetUrl: `${env.CLIENT_URL}/reset-password?token=${token}`,
    });
  } catch (error) {
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();

    console.error(
      'Password reset email delivery failed.',
      safeEmailErrorDetails(error),
    );

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      502,
      'The password reset email could not be delivered. Check your SMTP settings and try again.',
    );
  }
}

export async function resetUserPassword(input: ResetPasswordInput) {
  const user = await UserModel.findOne({
    passwordResetTokenHash: hashPasswordResetToken(input.token),
    passwordResetExpiresAt: { $gt: new Date() },
  }).select('+passwordHash +passwordResetTokenHash +passwordResetExpiresAt');

  if (!user) {
    throw new ApiError(
      400,
      'This password reset link is invalid or expired. Request a new reset link.',
    );
  }

  user.passwordHash = await bcrypt.hash(input.password, 12);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  user.forcePasswordChange = false;
  await user.save();
}

export function createSessionTokens(
  user: UserDocument,
  rememberMe = false,
  organizationId = user.lastActiveOrganizationId?.toString(),
) {
  const refreshTtl = rememberMe
    ? REMEMBERED_REFRESH_TOKEN_TTL_SECONDS
    : REFRESH_TOKEN_TTL_SECONDS;

  return {
    accessToken: signToken(
      user._id.toString(),
      'access',
      ACCESS_TOKEN_TTL_SECONDS,
      {},
      organizationId,
    ),
    accessTokenTtl: ACCESS_TOKEN_TTL_SECONDS,
    refreshToken: signToken(
      user._id.toString(),
      'refresh',
      refreshTtl,
      { remember: rememberMe },
      organizationId,
    ),
    refreshTokenTtl: refreshTtl,
  };
}

export async function getUserFromAccessToken(token: string) {
  const payload = verifyToken(token, 'access');
  const user = await UserModel.findById(payload.sub);

  if (!user) {
    throw new ApiError(401, 'Your account could not be found.');
  }

  return { user, organizationId: payload.organizationId };
}

export async function getUserFromRefreshToken(token: string) {
  const payload = verifyToken(token, 'refresh');
  const user = await UserModel.findById(payload.sub);

  if (!user) {
    throw new ApiError(401, 'Your session has expired. Please log in again.');
  }

  return {
    user,
    rememberMe: payload.remember === true,
    organizationId: payload.organizationId,
  };
}

export async function switchUserOrganization(
  user: UserDocument,
  organizationId: string,
) {
  const workspace = await ensureUserWorkspace(user, organizationId);
  user.lastActiveOrganizationId = workspace.organization._id;
  await user.save();
  return workspace;
}

export async function updateUserSettings(
  user: UserDocument,
  input: UpdateSettingsInput,
) {
  user.name = input.name;
  user.businessName = input.businessName;
  user.businessAddress = input.businessAddress;
  user.defaultCurrency = input.defaultCurrency;
  user.defaultHourlyRate = input.defaultHourlyRate;
  user.invoicePrefix = input.invoicePrefix;
  user.defaultInvoiceNotes = input.defaultInvoiceNotes;
  await user.save();

  return toAuthUser(user);
}
