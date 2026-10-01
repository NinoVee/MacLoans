import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Deployment self-check. Reports which settings are present and whether the database is ready.
 * Never returns secret values.
 */
export async function GET() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const secret = process.env.AUTH_SECRET;
  const checks: Record<string, { ok: boolean; detail: string }> = {
    databaseUrl: dbUrl
      ? { ok: true, detail: /neon\.tech|neon\.build/.test(dbUrl) ? "Set (Neon)" : "Set (non-Neon Postgres)" }
      : { ok: false, detail: "DATABASE_URL is not set. Connect Neon under the Vercel project's Storage tab, or add it in Settings → Environment Variables." },
    authSecret:
      secret && secret.length >= 16
        ? { ok: true, detail: "Set" }
        : { ok: false, detail: secret ? "AUTH_SECRET is shorter than 16 characters." : "AUTH_SECRET is not set. Add it in Settings → Environment Variables." },
  };

  if (dbUrl) {
    try {
      await queryOne("SELECT 1");
      checks.databaseConnection = { ok: true, detail: "Connected" };
      const t = await queryOne<{ users: string | null; guidelines: string | null }>(
        "SELECT to_regclass('public.users')::text AS users, to_regclass('public.lender_guidelines')::text AS guidelines",
      );
      const tablesOk = !!t?.users && !!t?.guidelines;
      checks.tables = tablesOk
        ? { ok: true, detail: "Created" }
        : { ok: false, detail: "Tables are missing. Redeploy with the vercel-build script (merged to main), or run `npm run db:migrate`." };
      if (tablesOk) {
        const a = await queryOne<{ n: number }>("SELECT count(*)::int AS n FROM users WHERE role = 'admin'");
        checks.adminAccount = a && a.n > 0
          ? { ok: true, detail: `${a.n} admin account(s)` }
          : { ok: false, detail: "No admin account. Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD, then redeploy." };
      }
    } catch (e) {
      checks.databaseConnection = { ok: false, detail: `Could not query the database: ${e instanceof Error ? e.message.slice(0, 200) : "unknown error"}` };
    }
  }

  const ok = Object.values(checks).every((c) => c.ok);
  return NextResponse.json({ ok, environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV, checks }, { status: ok ? 200 : 503 });
}
