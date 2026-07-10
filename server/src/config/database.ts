import mongoose from 'mongoose';

import { env } from './env.js';

mongoose.set('strictQuery', true);

let connectionPromise: Promise<typeof mongoose> | null = null;

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (connectionPromise) {
    await connectionPromise;
    return;
  }

  try {
    connectionPromise = mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 4_000,
    });
    await connectionPromise;
    console.info(`MongoDB connected: ${mongoose.connection.name}`);
  } catch (error) {
    console.warn(
      'MongoDB is unavailable. The API will run in degraded mode until the database is started.',
    );

    if (env.NODE_ENV === 'production') {
      throw error;
    }
  } finally {
    connectionPromise = null;
  }
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
