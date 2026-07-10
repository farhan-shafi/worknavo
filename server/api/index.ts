import type { IncomingMessage, ServerResponse } from 'node:http';

import { app } from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  await connectDatabase();
  app(request, response);
}
