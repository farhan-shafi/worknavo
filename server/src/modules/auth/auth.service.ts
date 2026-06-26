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
  UpdateSettingsInput,
} from './auth.validation.js';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const REMEMBERED_REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

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
