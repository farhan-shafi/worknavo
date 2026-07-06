import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import {
  authRateLimit,
  passwordResetRateLimit,
} from '../../middleware/rate-limit.middleware.js';
import {
  forgotPassword,
  login,
  logout,
  me,
  refresh,
  register,
  resetPassword,
  showAvatar,
  switchOrganization,
  updateSettings,
  uploadAvatar,
  replaceTemporaryPassword,
} from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/register', authRateLimit, register);
authRouter.post('/login', authRateLimit, login);
authRouter.post('/logout', logout);
authRouter.post('/refresh', authRateLimit, refresh);
authRouter.get('/me', requireAuth, me);
authRouter.patch('/settings', requireAuth, updateSettings);
authRouter.post('/avatar', requireAuth, uploadAvatar);
authRouter.get('/avatar/:filename', requireAuth, showAvatar);
authRouter.post(
  '/replace-temporary-password',
  requireAuth,
  replaceTemporaryPassword,
);
authRouter.post('/switch-organization', requireAuth, switchOrganization);
authRouter.post('/forgot-password', passwordResetRateLimit, forgotPassword);
authRouter.post('/reset-password', passwordResetRateLimit, resetPassword);
