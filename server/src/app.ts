import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { requestContext } from './middleware/request-context.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { clientRouter } from './modules/clients/client.routes.js';
import { invoiceRouter } from './modules/invoices/invoice.routes.js';
import { reportRouter } from './modules/reports/report.routes.js';
import { projectRouter } from './modules/projects/project.routes.js';
import { workLogRouter } from './modules/work-logs/work-log.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { organizationRouter } from './modules/organizations/organization.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { notificationRouter } from './modules/notifications/notification.routes.js';
import { memberRouter } from './modules/members/member.routes.js';
import { categoryRouter } from './modules/categories/category.routes.js';
import { invitationRouter } from './modules/invitations/invitation.routes.js';
import { analyticsRouter } from './modules/analytics/analytics.routes.js';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const clientDistPath = join(currentDirectory, '../../client/dist');
const clientIndexPath = join(clientDistPath, 'index.html');
const shouldServeClient =
  env.NODE_ENV === 'production' && existsSync(clientIndexPath);

export const app = express();

app.disable('x-powered-by');
app.use(requestContext);
app.use(helmet());
app.use(
  cors({
    credentials: true,
    origin: env.CLIENT_URL,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

app.get('/api', (_request, response) => {
  response.json({
    name: 'ClientFlow API',
    version: '0.1.0',
    health: '/api/health',
  });
});
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/organizations', organizationRouter);
app.use('/api/audit-events', auditRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/members', memberRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/invitations', invitationRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/clients', clientRouter);
app.use('/api/invoices', invoiceRouter);
app.use('/api/reports', reportRouter);
app.use('/api/projects', projectRouter);
app.use('/api/work-logs', workLogRouter);

if (shouldServeClient) {
  app.use(express.static(clientDistPath, { index: false }));
  app.get(/^(?!\/api(?:\/|$)).*/, (_request, response) => {
    response.sendFile(clientIndexPath);
  });
}

app.use(notFoundHandler);
app.use(errorHandler);
