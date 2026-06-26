import type { NextFunction, Request, Response } from 'express';

import { authCookieNames } from '../modules/auth/auth.controller.js';
import { getUserFromAccessToken } from '../modules/auth/auth.service.js';
import { sessionWorkspace } from '../modules/organizations/organization.service.js';
import { ApiError } from '../utils/api-error.js';

export async function requireAuth(
  request: Request,
  _response: Response,
  next: NextFunction,
) {
  const accessToken = request.cookies[authCookieNames.access] as
    | string
    | undefined;

  if (!accessToken) {
    next(new ApiError(401, 'You need to log in to continue.'));
    return;
  }

  try {
    const authenticated = await getUserFromAccessToken(accessToken);
    request.user = authenticated.user;
    const workspace = await sessionWorkspace(
      authenticated.user,
      authenticated.organizationId,
    );
    request.organization = workspace.organization;
    request.membership = workspace.membership;
    request.permissions = workspace.permissions;
    next();
  } catch {
    next(new ApiError(401, 'Your session has expired. Please log in again.'));
  }
}
