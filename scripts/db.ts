import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";

config({ path: ".env.local" });
config();

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env.local and add your Neon connection string.");
  process.exit(1);
}

let pool: Pool | undefined;
const sql = /neon\.tech|neon\.build/.test(url) ? neon(url) : undefined;
if (!sql) pool = new Pool({ connectionString: url });

export async function q<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  if (sql) return (await sql.query(text, params)) as T[];
  return (await pool!.query(text, params)).rows as T[];
}

export async function close() {
  await pool?.end();
}
