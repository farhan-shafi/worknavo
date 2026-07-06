import type {
  AuthResponse,
  MessageResponse,
  SessionResponse,
} from '@clientflow/shared';
import type { CookieOptions, Request, Response } from 'express';

import { env } from '../../config/env.js';
import { toAuthUser } from '../../models/User.model.js';
import { ApiError } from '../../utils/api-error.js';
import {
  createSessionTokens,
  getUserFromRefreshToken,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetUserPassword,
  switchUserOrganization,
  updateUserSettings,
} from './auth.service.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  switchOrganizationSchema,
  updateSettingsSchema,
} from './auth.validation.js';
import { sessionWorkspace } from '../organizations/organization.service.js';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const ACCESS_COOKIE = 'clientflow_access';
const REFRESH_COOKIE = 'clientflow_refresh';

function cookieOptions(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    maxAge,
  };
}

function setSessionCookies(
  response: Response,
  tokens: ReturnType<typeof createSessionTokens>,
) {
  response.cookie(
    ACCESS_COOKIE,
    tokens.accessToken,
    cookieOptions(tokens.accessTokenTtl * 1000),
  );
  response.cookie(
    REFRESH_COOKIE,
    tokens.refreshToken,
    cookieOptions(tokens.refreshTokenTtl * 1000),
  );
}

function clearSessionCookies(response: Response) {
  const options: CookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  };

  response.clearCookie(ACCESS_COOKIE, options);
  response.clearCookie(REFRESH_COOKIE, options);
}

export async function register(request: Request, response: Response) {
  const input = registerSchema.parse(request.body);
  const { publicUser, user } = await registerUser(input);
  const workspace = await sessionWorkspace(user);
  setSessionCookies(
    response,
    createSessionTokens(user, true, workspace.organization._id.toString()),
  );

  const body: AuthResponse = {
    message: 'Your ClientFlow workspace is ready.',
    user: publicUser,
  };

  response.status(201).json(body);
}

export async function login(request: Request, response: Response) {
  const input = loginSchema.parse(request.body);
  const { publicUser, user } = await loginUser(input);
  const workspace = await sessionWorkspace(user);
  setSessionCookies(
    response,
    createSessionTokens(
      user,
      input.rememberMe,
      workspace.organization._id.toString(),
    ),
  );

  const body: AuthResponse = {
    message: 'Welcome back.',
    user: publicUser,
  };

  response.status(200).json(body);
}

export function logout(_request: Request, response: Response) {
  clearSessionCookies(response);
  const body: MessageResponse = { message: 'You have been logged out.' };
  response.status(200).json(body);
}

export async function me(request: Request, response: Response) {
  if (!request.user) {
    throw new ApiError(401, 'You need to log in to continue.');
  }

  const workspace = await sessionWorkspace(
    request.user,
    request.organization?._id.toString(),
  );
  const body: SessionResponse = {
    user: toAuthUser(request.user),
    ...workspace.contract,
  };
  response.status(200).json(body);
}

export async function refresh(request: Request, response: Response) {
  const refreshToken = request.cookies[REFRESH_COOKIE] as string | undefined;

  if (!refreshToken) {
    throw new ApiError(401, 'Your session has expired. Please log in again.');
  }

  try {
    const { rememberMe, user, organizationId } =
      await getUserFromRefreshToken(refreshToken);
    const workspace = await sessionWorkspace(user, organizationId);
    const tokens = createSessionTokens(
      user,
      rememberMe,
      workspace.organization._id.toString(),
    );
    setSessionCookies(response, tokens);
    const body: SessionResponse = {
      user: toAuthUser(user),
      ...workspace.contract,
    };
    response.status(200).json(body);
  } catch (error) {
    clearSessionCookies(response);
    throw error;
  }
}

export async function switchOrganization(request: Request, response: Response) {
  if (!request.user) {
    throw new ApiError(401, 'You need to log in to continue.');
  }
  const { organizationId } = switchOrganizationSchema.parse(request.body);
  const workspace = await switchUserOrganization(request.user, organizationId);
  setSessionCookies(
    response,
    createSessionTokens(
      request.user,
      true,
      workspace.organization._id.toString(),
    ),
  );
  const body: SessionResponse = {
    user: toAuthUser(request.user),
    ...(await sessionWorkspace(request.user, organizationId)).contract,
  };
  response.status(200).json(body);
}

export async function forgotPassword(request: Request, response: Response) {
  const input = forgotPasswordSchema.parse(request.body);
  await requestPasswordReset(input.email);
  const body: MessageResponse = {
    message:
      'If an account exists for that email, a temporary reset code has been sent.',
  };
  response.status(202).json(body);
}

export async function resetPassword(request: Request, response: Response) {
  const input = resetPasswordSchema.parse(request.body);
  await resetUserPassword(input);
  const body: MessageResponse = {
    message: 'Your password has been reset. You can now log in.',
  };
  response.status(200).json(body);
}

export async function updateSettings(request: Request, response: Response) {
  if (!request.user) {
    throw new ApiError(401, 'You need to log in to continue.');
  }

  const input = updateSettingsSchema.parse(request.body);
  const user = await updateUserSettings(request.user, input);
  const body: AuthResponse = {
    message: 'Settings saved successfully.',
    user,
  };
  response.status(200).json(body);
}

export async function replaceTemporaryPassword(
  request: Request,
  response: Response,
) {
  if (!request.user) throw new ApiError(401, 'Log in to continue.');
  const { password } = z
    .object({
      password: z
        .string()
        .min(8)
        .max(72)
        .regex(/[a-z]/)
        .regex(/[A-Z]/)
        .regex(/[0-9]/),
    })
    .parse(request.body);
  request.user.passwordHash = await bcrypt.hash(password, 12);
  request.user.forcePasswordChange = false;
  await request.user.save();
  response.json({
    message: 'Your password has been replaced.',
    user: toAuthUser(request.user),
  });
}

export const authCookieNames = {
  access: ACCESS_COOKIE,
  refresh: REFRESH_COOKIE,
};
