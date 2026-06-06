import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Disable prefetch as it is not supported for "Transaction" pool mode
const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Use a global variable to prevent multiple connections during hot-reloading
declare global {
  var __db__: postgres.Sql | undefined;
}

// Create a singleton postgres client
const client = globalThis.__db__ ?? postgres(connectionString, { prepare: false });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__db__ = client;
}

// Initialize Drizzle with the postgres client
export const db = drizzle(client, { schema });

// Re-export schema for convenience
export * from './schema';
