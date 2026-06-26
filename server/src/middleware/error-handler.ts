import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({
    message: `Route ${request.method} ${request.originalUrl} was not found.`,
    requestId: request.requestId,
  });
};

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  request,
  response,
  _next,
) => {
  void _next;

  if (error instanceof ApiError) {
    response.status(error.statusCode).json({
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
      requestId: request.requestId,
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(422).json({
      message: 'The submitted data is invalid.',
      issues: error.flatten().fieldErrors,
      requestId: request.requestId,
    });
    return;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  ) {
    response.status(409).json({
      message: 'An account with this email already exists.',
      requestId: request.requestId,
    });
    return;
  }

  console.error(`[${request.requestId}]`, error);

  response.status(500).json({
    message: 'Something went wrong. Please try again.',
    requestId: request.requestId,
    ...(env.NODE_ENV === 'development' && error instanceof Error
      ? { detail: error.message }
      : {}),
  });
};
