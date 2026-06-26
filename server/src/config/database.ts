import mongoose from 'mongoose';

import { env } from './env.js';

mongoose.set('strictQuery', true);

export async function connectDatabase() {
  try {
    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 4_000,
    });
    console.info(`MongoDB connected: ${mongoose.connection.name}`);
  } catch (error) {
    console.warn(
      'MongoDB is unavailable. The API will run in degraded mode until the database is started.',
    );

    if (env.NODE_ENV === 'production') {
      throw error;
    }
  }
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
