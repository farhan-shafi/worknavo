import type { DatabaseStatus, HealthResponse } from '@clientflow/shared';
import { Router } from 'express';
import mongoose from 'mongoose';

const databaseStatuses: Record<number, DatabaseStatus> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnected',
};

export const healthRouter = Router();

healthRouter.get('/', (_request, response) => {
  const databaseStatus =
    databaseStatuses[mongoose.connection.readyState] ?? 'disconnected';

  const health: HealthResponse = {
    status: databaseStatus === 'connected' ? 'ok' : 'degraded',
    service: 'clientflow-api',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    database: {
      status: databaseStatus,
      name: mongoose.connection.name || null,
    },
  };

  response.status(200).json(health);
});
