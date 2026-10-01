import "server-only";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";

type Runner = (text: string, params: unknown[]) => Promise<Record<string, unknown>[]>;

let runner: Runner | undefined;

function getRunner(): Runner {
  if (runner) return runner;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and add your Neon connection string.");

  if (/neon\.tech|neon\.build/.test(url)) {
    // Neon serverless HTTP driver: no persistent connections, ideal for serverless deploys.
    const sql = neon(url);
    runner = (text, params) => sql.query(text, params) as Promise<Record<string, unknown>[]>;
  } else {
    // Any other Postgres (e.g. a local database for development).
    const pool = new Pool({ connectionString: url, max: 5 });
    runner = async (text, params) => (await pool.query(text, params)).rows;
  }
  return runner;
}

export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await getRunner()(text, params)) as T[];
}

export async function queryOne<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
