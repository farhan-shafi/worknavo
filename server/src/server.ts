import { createServer } from 'node:http';

import { app } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';

const server = createServer(app);

async function startServer() {
  await connectDatabase();

  server.listen(env.PORT, () => {
    console.info(
      `WorkNavo API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`,
    );
  });
}

async function shutdown(signal: string) {
  console.info(`${signal} received. Closing WorkNavo gracefully.`);

  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

startServer().catch((error) => {
  console.error('WorkNavo failed to start.', error);
  process.exit(1);
});
