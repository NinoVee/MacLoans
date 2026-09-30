import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAccessibleApplication, getApplicationDetail } from "@/lib/applications";
import { EDITABLE_STATUSES, STATUS_LABELS, TERMINAL_STATUSES } from "@/lib/status";
import { LOAN_TYPE_LABELS } from "@/lib/underwriting/types";
import { StatusBadge } from "@/components/Badges";
import { UnderwritingReport } from "@/components/UnderwritingReport";
import { ActivityPanel, ConditionsPanel, DocumentsPanel, MessagesPanel, Panel, ProgressTracker } from "@/components/loan/Panels";
import { withdrawApplicationAction } from "@/app/actions/applications";
import { dateTime } from "@/lib/format";

export default async function ApplicationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ submitted?: string }> }) {
  const { id } = await params;
  const { submitted } = await searchParams;
  const user = await requireUser(["applicant"]);
  const app = await getAccessibleApplication(user, id);
  if (!app || app.applicant_id !== user.id) notFound();
  if (app.status === "draft") redirect(`/dashboard/applications/${id}/edit`);

  const detail = await getApplicationDetail(app.id, false);
  const canUpload = !TERMINAL_STATUSES.includes(app.status);
  const p = app.data.property ?? {};
  const address = [p.address, p.city, p.state].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      {submitted && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          <strong>Application submitted.</strong> Your preliminary result is below. Upload documents for any open conditions to keep your loan moving.
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-xs font-semibold text-navy-900/50 hover:text-navy-900">← My Applications</Link>
          <h1 className="mt-1 font-serif text-3xl font-bold">{LOAN_TYPE_LABELS[app.loan_type]}</h1>
          <p className="text-sm text-navy-900/60">{app.ref_number}{address && ` · ${address}`} · Submitted {dateTime(app.submitted_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={app.status} />
          {EDITABLE_STATUSES.includes(app.status) && <Link href={`/dashboard/applications/${app.id}/edit`} className="btn-outline">Update application</Link>}
          {!TERMINAL_STATUSES.includes(app.status) && (
            <form action={withdrawApplicationAction.bind(null, app.id)}>
              <button className="btn-ghost text-xs text-rose-700">Withdraw</button>
            </form>
          )}
        </div>
      </div>

      <div className="card p-5">
        <ProgressTracker status={app.status} />
      </div>

      {app.final_decision && (
        <div className="card border-l-4 border-l-gold-500 p-5">
          <div className="eyebrow">Underwriter Decision</div>
          <div className="mt-1 font-serif text-xl font-bold">{STATUS_LABELS[app.final_decision as keyof typeof STATUS_LABELS] ?? app.final_decision}</div>
          {app.final_decision_note && <p className="mt-2 text-sm text-navy-900/75">{app.final_decision_note}</p>}
          <p className="mt-2 text-xs text-navy-900/50">{dateTime(app.final_decision_at)}</p>
        </div>
      )}
      {app.status === "info_requested" && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          The lending team has requested additional information. See Messages below, then{" "}
          <Link href={`/dashboard/applications/${app.id}/edit`} className="font-semibold underline">update your application</Link> or upload the requested documents.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Automated Underwriting">
            {app.engine_result ? (
              <UnderwritingReport loanType={app.loan_type} result={app.engine_result} />
            ) : (
              <p className="text-sm text-navy-900/60">Your application is queued for analysis.</p>
            )}
            <p className="mt-6 rounded-md bg-cream p-3 text-[11px] leading-relaxed text-navy-900/60">
              This is a preliminary determination based on information you provided and is not a commitment to lend. Final approval is
              subject to lender requirements, verification, appraisal, title review, documentation, and underwriting and compliance review.
            </p>
          </Panel>
          <ConditionsPanel applicationId={app.id} conditions={detail.conditions} staff={false} canUpload={canUpload} />
          <MessagesPanel applicationId={app.id} messages={detail.messages} staff={false} />
        </div>
        <div className="space-y-6">
          <DocumentsPanel applicationId={app.id} documents={detail.documents} staff={false} canUpload={canUpload} />
          <ActivityPanel activity={detail.activity} />
        </div>
      </div>
    </div>
  );
}
