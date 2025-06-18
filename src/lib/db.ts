
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config(); // Ensure environment variables are loaded

let pool: Pool;

try {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set.');
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, // Basic SSL for Neon, adjust as needed
  });

  pool.on('connect', () => {
    console.log('Connected to PostgreSQL database (Neon).');
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client in PostgreSQL pool', err);
    // process.exit(-1); // Optional: exit if pool errors are critical
  });

} catch (error) {
  console.error('Failed to initialize PostgreSQL connection pool:', error);
  // Fallback or throw to prevent app from running without DB
  // For now, we'll let it throw, so server startup fails clearly.
  throw error;
}


// Helper function to execute queries
export const query = async (text: string, params?: any[]) => {
  if (!pool) {
    throw new Error("Database pool is not initialized. Check DATABASE_URL and server startup logs.");
  }
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Error executing query', { text, params, error });
    throw error;
  }
};

// Export the pool directly if needed for transactions or specific client management
export { pool };
