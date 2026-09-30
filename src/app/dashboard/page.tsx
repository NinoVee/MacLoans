import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { LOAN_TYPE_LABELS, type LoanType } from "@/lib/underwriting/types";
import { DecisionBadge, StatusBadge } from "@/components/Badges";
import { date, usd } from "@/lib/format";

export const metadata: Metadata = { title: "My Applications" };

interface Row {
  id: string;
  ref_number: string;
  loan_type: LoanType;
  status: string;
  engine_decision: string | null;
  amount: number | null;
  address: string | null;
  open_conditions: number;
  updated_at: string;
}

export default async function Dashboard() {
  const user = await requireUser(["applicant"]);
  const apps = await query<Row>(
    `SELECT a.id, a.ref_number, a.loan_type, a.status, a.engine_decision, a.updated_at,
            (a.data->'loan'->>'requestedAmount')::numeric::float8 AS amount,
            NULLIF(concat_ws(', ', a.data->'property'->>'address', a.data->'property'->>'city', a.data->'property'->>'state'), '') AS address,
            (SELECT count(*)::int FROM conditions c WHERE c.application_id = a.id AND c.status = 'open') AS open_conditions
       FROM applications a WHERE a.applicant_id = $1 ORDER BY a.updated_at DESC`,
    [user.id],
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Applicant Dashboard</p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Welcome, {user.fullName.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-navy-900/60">Track your applications, upload documents and message the lending team.</p>
        </div>
        <Link href="/dashboard/applications/new" className="btn-gold">+ New Application</Link>
      </div>

      {apps.length === 0 ? (
        <div className="card p-10 text-center">
          <h2 className="font-serif text-xl font-bold">No applications yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-navy-900/60">
            Start an application for a residential, investment, commercial, construction, land or construction-to-permanent loan.
            You&apos;ll receive a preliminary result the moment you submit.
          </p>
          <Link href="/dashboard/applications/new" className="btn-navy mt-6">Start my application</Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {apps.map((a) => (
            <Link key={a.id} href={a.status === "draft" ? `/dashboard/applications/${a.id}/edit` : `/dashboard/applications/${a.id}`} className="card block p-5 transition hover:border-gold-500/60 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-navy-900/50">{a.ref_number}</div>
                  <div className="font-serif text-lg font-bold">{LOAN_TYPE_LABELS[a.loan_type]}</div>
                  <div className="text-sm text-navy-900/60">{a.address ?? "Property address not provided"}</div>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-semibold">{usd(a.amount)}</span>
                <DecisionBadge decision={a.engine_decision} />
              </div>
              <div className="mt-3 flex justify-between text-xs text-navy-900/50">
                <span>{a.open_conditions > 0 ? `${a.open_conditions} open condition(s)` : a.status === "draft" ? "Draft — continue application" : "No open conditions"}</span>
                <span>Updated {date(a.updated_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
