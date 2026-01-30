import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Create the drizzle instance with schema
export const db = drizzle(pool, { schema });

// Export the pool for direct access if needed
export { pool };

// Export types
export type Database = typeof db;

// Helper to close the pool (for graceful shutdown)
export async function closeDatabase(): Promise<void> {
  await pool.end();
}

// Health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    return true;
  } catch (error) {
    console.error("Database connection check failed:", error);
    return false;
  }
}
