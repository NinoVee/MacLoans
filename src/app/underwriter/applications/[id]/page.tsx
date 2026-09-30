import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getApplication, getApplicationDetail, getGuidelines } from "@/lib/applications";
import { queryOne } from "@/lib/db";
import { LOAN_TYPE_LABELS } from "@/lib/underwriting/types";
import { STATUS_LABELS } from "@/lib/status";
import { DecisionBadge, StatusBadge } from "@/components/Badges";
import { FindingsList, MetricsGrid } from "@/components/UnderwritingReport";
import { ActivityPanel, ApplicationDataView, ConditionsPanel, DocumentsPanel, MessagesPanel, Panel, ProgressTracker } from "@/components/loan/Panels";
import { AddConditionForm, DecisionForm } from "@/components/loan/ClientForms";
import { assignToMeAction, rerunEngineAction } from "@/app/actions/underwriter";
import { dateTime, pct, ratio, usd } from "@/lib/format";

export default async function UnderwriterApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(["underwriter", "admin"]);
  const app = await getApplication(id);
  if (!app || app.status === "draft") notFound();

  const [detail, applicant, assignee, rules] = await Promise.all([
    getApplicationDetail(app.id, true),
    queryOne<{ full_name: string; email: string; phone: string | null; company: string | null }>("SELECT full_name, email, phone, company FROM users WHERE id = $1", [app.applicant_id]),
    app.assigned_to ? queryOne<{ full_name: string }>("SELECT full_name FROM users WHERE id = $1", [app.assigned_to]) : null,
    getGuidelines(app.loan_type),
  ]);
  const r = app.engine_result;
  const p = app.data.property ?? {};
  const address = [p.address, p.city, p.state, p.zip].filter(Boolean).join(", ");

  const guidelineRows: [string, string | null][] = [
    ["Min credit score", rules.minCreditScore !== null ? String(rules.minCreditScore) : null],
    ["Max LTV", rules.maxLtv !== null ? pct(rules.maxLtv, 0) : null],
    ["Max LTC", rules.maxLtc !== null ? pct(rules.maxLtc, 0) : null],
    ["Max loan / completed value", rules.maxLtArv !== null ? pct(rules.maxLtArv, 0) : null],
    ["Max front DTI", rules.maxFrontDti !== null ? pct(rules.maxFrontDti, 0) : null],
    ["Max back DTI", rules.maxBackDti !== null ? pct(rules.maxBackDti, 0) : null],
    ["Min DSCR", rules.minDscr !== null ? ratio(rules.minDscr) : null],
    ["Min reserves", rules.minReserveMonths !== null ? `${rules.minReserveMonths} months` : null],
    ["Loan amount", rules.minLoanAmount !== null || rules.maxLoanAmount !== null ? `${usd(rules.minLoanAmount)} – ${usd(rules.maxLoanAmount)}` : null],
    ["Min contingency", rules.minContingencyPct !== null ? pct(rules.minContingencyPct, 0) : null],
    ["Max timeline", rules.maxTimelineMonths !== null ? `${rules.maxTimelineMonths} months` : null],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/underwriter" className="text-xs font-semibold text-navy-900/50 hover:text-navy-900">← Pipeline</Link>
          <h1 className="mt-1 font-serif text-3xl font-bold">
            {app.ref_number} · {LOAN_TYPE_LABELS[app.loan_type]}
          </h1>
          <p className="text-sm text-navy-900/60">
            {applicant?.full_name} · {applicant?.email}
            {applicant?.phone && ` · ${applicant.phone}`}
            {applicant?.company && ` · ${applicant.company}`}
          </p>
          <p className="text-sm text-navy-900/60">{address || "No property address"} · Submitted {dateTime(app.submitted_at)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={app.status} />
          <DecisionBadge decision={app.engine_decision} />
          {app.overridden && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">Overridden</span>}
        </div>
      </div>

      <div className="card p-5">
        <ProgressTracker status={app.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel
            title="Automated Underwriting Analysis"
            action={
              <form action={rerunEngineAction.bind(null, app.id)}>
                <button className="btn-outline px-3 py-1.5 text-xs">Re-run engine</button>
              </form>
            }
          >
            {r ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <DecisionBadge decision={r.decision} large />
                  <span className="text-xs text-navy-900/50">Engine v{r.engineVersion} · {dateTime(r.evaluatedAt)}</span>
                </div>
                <p className="text-sm text-navy-900/80">{r.summary}</p>
                <MetricsGrid loanType={app.loan_type} result={r} />
                <div>
                  <h3 className="mb-1 font-serif text-lg font-bold">Rule Findings</h3>
                  <FindingsList result={r} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-navy-900/60">The engine has not run on this file yet.</p>
            )}
          </Panel>

          <Panel title="Application Data">
            <ApplicationDataView loanType={app.loan_type} data={app.data} />
          </Panel>

          <ConditionsPanel applicationId={app.id} conditions={detail.conditions} staff canUpload={false} />
          <MessagesPanel applicationId={app.id} messages={detail.messages} staff />
        </div>

        <div className="space-y-6">
          <Panel title="Underwriter Decision">
            <div className="mb-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-navy-900/60">Assigned to</span>
                <span className="font-medium">{assignee?.full_name ?? "Unassigned"}</span>
              </div>
              {app.final_decision && (
                <div className="flex justify-between">
                  <span className="text-navy-900/60">Last decision</span>
                  <span className="font-medium">{STATUS_LABELS[app.final_decision as keyof typeof STATUS_LABELS] ?? app.final_decision}</span>
                </div>
              )}
            </div>
            {app.assigned_to !== user.id && (
              <form action={assignToMeAction.bind(null, app.id)} className="mb-4">
                <button className="btn-outline w-full">Assign to me</button>
              </form>
            )}
            <DecisionForm applicationId={app.id} engineDecision={app.engine_decision} />
          </Panel>

          <Panel title="Add Condition">
            <AddConditionForm applicationId={app.id} />
          </Panel>

          <DocumentsPanel applicationId={app.id} documents={detail.documents} staff canUpload />

          <Panel title="Program Guidelines">
            <p className="mb-2 text-xs text-navy-900/50">{rules.label} — current lender criteria</p>
            <dl className="text-sm">
              {guidelineRows
                .filter(([, v]) => v !== null)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-navy-900/5 py-1">
                    <dt className="text-navy-900/60">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
            </dl>
          </Panel>

          <ActivityPanel activity={detail.activity} />
        </div>
      </div>
    </div>
  );
}
