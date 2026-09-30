import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { DECISIONS, DECISION_LABELS, LOAN_TYPES, LOAN_TYPE_LABELS, type LoanType } from "@/lib/underwriting/types";
import { STATUSES, STATUS_LABELS } from "@/lib/status";
import { DecisionBadge, StatusBadge } from "@/components/Badges";
import { date, pct, ratio, usd } from "@/lib/format";

export const metadata: Metadata = { title: "Underwriting Pipeline" };

interface Row {
  id: string;
  ref_number: string;
  loan_type: LoanType;
  status: string;
  engine_decision: string | null;
  overridden: boolean;
  applicant_name: string;
  amount: number | null;
  ltv: number | null;
  ltc: number | null;
  dti: number | null;
  dscr: number | null;
  credit: number | null;
  open_conditions: number;
  pending_docs: number;
  assignee: string | null;
  submitted_at: string | null;
}

type SP = { status?: string; decision?: string; type?: string; q?: string; mine?: string };

export default async function Pipeline({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser(["underwriter", "admin"]);
  const sp = await searchParams;
  const where = ["a.status <> 'draft'"];
  const params: unknown[] = [];
  const add = (clause: string, v: unknown) => {
    params.push(v);
    where.push(clause.replace("?", `$${params.length}`));
  };
  if (sp.status && (STATUSES as readonly string[]).includes(sp.status)) add("a.status = ?", sp.status);
  else if (!sp.status) where.push("a.status NOT IN ('closed','declined','withdrawn')");
  if (sp.decision && (DECISIONS as readonly string[]).includes(sp.decision)) add("a.engine_decision = ?", sp.decision);
  if (sp.type && (LOAN_TYPES as readonly string[]).includes(sp.type)) add("a.loan_type = ?", sp.type);
  if (sp.q) {
    params.push(`%${sp.q}%`);
    const i = params.length;
    where.push(`(a.ref_number ILIKE $${i} OR u.full_name ILIKE $${i} OR u.email ILIKE $${i})`);
  }
  if (sp.mine) add("a.assigned_to = ?", user.id);

  const rows = await query<Row>(
    `SELECT a.id, a.ref_number, a.loan_type, a.status, a.engine_decision, a.overridden, a.submitted_at,
            u.full_name AS applicant_name, s.full_name AS assignee,
            (a.engine_result->'metrics'->>'loanAmount')::float8 AS amount,
            (a.engine_result->'metrics'->>'ltv')::float8 AS ltv,
            (a.engine_result->'metrics'->>'ltc')::float8 AS ltc,
            (a.engine_result->'metrics'->>'backDti')::float8 AS dti,
            (a.engine_result->'metrics'->>'dscr')::float8 AS dscr,
            (a.data->'borrower'->>'creditScore')::float8 AS credit,
            (SELECT count(*)::int FROM conditions c WHERE c.application_id = a.id AND c.status IN ('open','submitted')) AS open_conditions,
            (SELECT count(*)::int FROM documents d WHERE d.application_id = a.id AND d.status = 'pending') AS pending_docs
       FROM applications a
       JOIN users u ON u.id = a.applicant_id
       LEFT JOIN users s ON s.id = a.assigned_to
      WHERE ${where.join(" AND ")}
      ORDER BY a.submitted_at DESC NULLS LAST LIMIT 200`,
    params,
  );

  const counts = await query<{ engine_decision: string | null; n: number }>(
    "SELECT engine_decision, count(*)::int AS n FROM applications WHERE status NOT IN ('draft','closed','declined','withdrawn') GROUP BY engine_decision",
  );
  const countOf = (d: string) => counts.find((c) => c.engine_decision === d)?.n ?? 0;
  const total = counts.reduce((s, c) => s + c.n, 0);

  const link = (patch: Partial<SP>) => {
    const next = { ...sp, ...patch };
    const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
    return `/underwriter${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Lender &amp; Underwriter Dashboard</p>
        <h1 className="mt-1 font-serif text-3xl font-bold">Underwriting Pipeline</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Link href={link({ decision: undefined })} className="card p-4 hover:border-gold-500">
          <div className="text-xs font-semibold tracking-wide text-navy-700 uppercase">Active Files</div>
          <div className="mt-1 font-serif text-3xl font-bold">{total}</div>
        </Link>
        {DECISIONS.map((d) => (
          <Link key={d} href={link({ decision: d })} className={`card p-4 hover:border-gold-500 ${sp.decision === d ? "ring-2 ring-gold-500" : ""}`}>
            <div className="text-xs font-semibold tracking-wide text-navy-700 uppercase">{DECISION_LABELS[d]}</div>
            <div className="mt-1 font-serif text-3xl font-bold">{countOf(d)}</div>
          </Link>
        ))}
      </div>

      <form className="card flex flex-wrap items-end gap-3 p-4" action="/underwriter">
        <div>
          <label className="label" htmlFor="q">Search</label>
          <input id="q" name="q" defaultValue={sp.q} placeholder="Ref #, name, email" className="input w-56" />
        </div>
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={sp.status ?? ""} className="input">
            <option value="">Active pipeline</option>
            {STATUSES.filter((s) => s !== "draft").map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="type">Program</label>
          <select id="type" name="type" defaultValue={sp.type ?? ""} className="input">
            <option value="">All programs</option>
            {LOAN_TYPES.map((t) => (
              <option key={t} value={t}>{LOAN_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="decision">Engine result</label>
          <select id="decision" name="decision" defaultValue={sp.decision ?? ""} className="input">
            <option value="">Any</option>
            {DECISIONS.map((d) => (
              <option key={d} value={d}>{DECISION_LABELS[d]}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="mine" value="1" defaultChecked={!!sp.mine} /> Assigned to me
        </label>
        <button className="btn-navy">Filter</button>
        <Link href="/underwriter" className="btn-ghost">Reset</Link>
      </form>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Loan</th>
              <th>Applicant</th>
              <th>Program</th>
              <th className="text-right">Amount</th>
              <th className="text-right">Credit</th>
              <th className="text-right">LTV / LTC</th>
              <th className="text-right">DTI / DSCR</th>
              <th>Engine</th>
              <th>Status</th>
              <th>Open items</th>
              <th>Assigned</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="py-10 text-center text-navy-900/50">No applications match these filters.</td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-cream/60">
                <td>
                  <Link href={`/underwriter/applications/${r.id}`} className="font-semibold text-navy-800 hover:underline">{r.ref_number}</Link>
                  <div className="text-[11px] text-navy-900/50">{date(r.submitted_at)}</div>
                </td>
                <td>{r.applicant_name}</td>
                <td className="text-xs">{LOAN_TYPE_LABELS[r.loan_type]}</td>
                <td className="text-right font-medium">{usd(r.amount)}</td>
                <td className="text-right">{r.credit ?? "—"}</td>
                <td className="text-right">{r.ltv !== null ? pct(r.ltv) : pct(r.ltc)}</td>
                <td className="text-right">{r.dscr !== null ? ratio(r.dscr) : pct(r.dti)}</td>
                <td>
                  <DecisionBadge decision={r.engine_decision} />
                  {r.overridden && <div className="mt-1 text-[10px] font-bold text-amber-700 uppercase">Overridden</div>}
                </td>
                <td><StatusBadge status={r.status} /></td>
                <td className="text-xs">
                  {r.open_conditions} cond. · {r.pending_docs} docs
                </td>
                <td className="text-xs">{r.assignee ?? <span className="text-navy-900/40">Unassigned</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
