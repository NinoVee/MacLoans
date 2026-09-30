import type { ActivityRow, ConditionRow, DocumentRow, MessageRow } from "@/lib/applications";
import { DOC_CATEGORIES } from "@/lib/underwriting/engine";
import { MILESTONES, milestoneIndex, type Status } from "@/lib/status";
import { dateTime, fileSize } from "@/lib/format";
import { PillBadge } from "@/components/Badges";
import { MessageForm, UploadForm } from "./ClientForms";
import { reviewDocumentAction, setConditionStatusAction } from "@/app/actions/underwriter";
import { STEPS, visibleFields } from "@/components/application/fields";
import type { ApplicationData, LoanType } from "@/lib/underwriting/types";

export function Panel({ title, action, children, className = "" }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-navy-900/10 px-5 py-3">
        <h2 className="font-serif text-lg font-bold">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function ProgressTracker({ status }: { status: Status }) {
  const stopped = status === "declined" || status === "withdrawn";
  const idx = milestoneIndex(status);
  const complete = status === "closed";
  return (
    <ol className="grid grid-cols-5 gap-2">
      {MILESTONES.map((m, i) => {
        const done = complete || i < idx;
        const active = !complete && i === idx;
        return (
          <li key={m.key} className="text-center">
            <div className={`h-2 rounded-full ${done ? "bg-gold-500" : active ? (stopped ? "bg-rose-400" : "bg-navy-900") : "bg-navy-900/10"}`} />
            <div className={`mt-2 text-[11px] font-semibold tracking-wide uppercase ${done || active ? "text-navy-900" : "text-navy-900/40"}`}>{m.label}</div>
          </li>
        );
      })}
    </ol>
  );
}

export function ConditionsPanel({ applicationId, conditions, staff, canUpload }: { applicationId: string; conditions: ConditionRow[]; staff: boolean; canUpload: boolean }) {
  const open = conditions.filter((c) => c.status === "open").length;
  return (
    <Panel title="Conditions & Required Documents" action={<span className="text-xs font-semibold text-navy-900/60">{open} open · {conditions.length} total</span>}>
      {conditions.length === 0 ? (
        <p className="text-sm text-navy-900/60">No conditions yet.</p>
      ) : (
        <ul className="divide-y divide-navy-900/5">
          {conditions.map((c) => (
            <li key={c.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`text-sm ${c.status === "satisfied" || c.status === "waived" ? "text-navy-900/50 line-through" : ""}`}>{c.description}</p>
                  <p className="mt-0.5 text-[11px] text-navy-900/50">
                    {c.doc_category ? DOC_CATEGORIES[c.doc_category] ?? c.doc_category : "General"} · {c.source === "engine" ? "Automated" : "Underwriter"}
                  </p>
                </div>
                <PillBadge value={c.status} />
              </div>
              {!staff && canUpload && c.status === "open" && (
                <div className="mt-2">
                  <UploadForm applicationId={applicationId} conditionId={c.id} defaultCategory={c.doc_category} compact />
                </div>
              )}
              {!staff && c.status === "submitted" && <p className="mt-1 text-xs text-sky-700">Document received — awaiting underwriter review.</p>}
              {staff && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(["satisfied", "waived", "open"] as const)
                    .filter((s) => s !== c.status)
                    .map((s) => (
                      <form key={s} action={setConditionStatusAction.bind(null, c.id, applicationId, s)}>
                        <button className="rounded border border-navy-900/15 px-2 py-0.5 text-[11px] font-semibold capitalize hover:bg-navy-900/5">
                          {s === "open" ? "Reopen" : `Mark ${s}`}
                        </button>
                      </form>
                    ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function DocumentsPanel({ applicationId, documents, staff, canUpload }: { applicationId: string; documents: DocumentRow[]; staff: boolean; canUpload: boolean }) {
  return (
    <Panel title="Documents">
      {documents.length === 0 ? (
        <p className="mb-4 text-sm text-navy-900/60">No documents uploaded yet.</p>
      ) : (
        <ul className="mb-5 divide-y divide-navy-900/5">
          {documents.map((d) => (
            <li key={d.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <a href={`/api/documents/${d.id}`} className="block truncate text-sm font-semibold text-navy-800 underline-offset-2 hover:underline">
                  {d.filename}
                </a>
                <p className="text-[11px] text-navy-900/50">
                  {DOC_CATEGORIES[d.category] ?? d.category} · {fileSize(d.size_bytes)} · {d.uploader_name} · {dateTime(d.created_at)}
                </p>
                {d.review_note && <p className="mt-1 text-xs text-rose-700">{d.review_note}</p>}
              </div>
              <div className="flex items-center gap-1.5">
                <PillBadge value={d.status} />
                {staff &&
                  (["accepted", "rejected"] as const)
                    .filter((s) => s !== d.status)
                    .map((s) => (
                      <form key={s} action={reviewDocumentAction.bind(null, d.id, applicationId, s, s === "rejected" ? "Document rejected — please upload a corrected copy." : undefined)}>
                        <button className="rounded border border-navy-900/15 px-2 py-0.5 text-[11px] font-semibold capitalize hover:bg-navy-900/5">{s === "accepted" ? "Accept" : "Reject"}</button>
                      </form>
                    ))}
              </div>
            </li>
          ))}
        </ul>
      )}
      {canUpload && <UploadForm applicationId={applicationId} />}
    </Panel>
  );
}

export function MessagesPanel({ applicationId, messages, staff }: { applicationId: string; messages: MessageRow[]; staff: boolean }) {
  return (
    <Panel title={staff ? "Messages & Notes" : "Messages with the Lending Team"}>
      <div className="mb-4 max-h-96 space-y-3 overflow-y-auto">
        {messages.length === 0 && <p className="text-sm text-navy-900/60">No messages yet.</p>}
        {messages.map((m) => {
          const fromStaff = m.sender_role !== "applicant";
          return (
            <div key={m.id} className={`rounded-lg p-3 text-sm ${m.internal ? "border border-dashed border-amber-400 bg-amber-50" : fromStaff ? "bg-navy-900/5" : "bg-gold-300/20"}`}>
              <div className="mb-1 flex justify-between gap-2 text-[11px] text-navy-900/60">
                <span className="font-semibold">
                  {m.sender_name}
                  {fromStaff && " · Lending Team"}
                  {m.internal && " · Internal note"}
                </span>
                <span>{dateTime(m.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap">{m.body}</p>
            </div>
          );
        })}
      </div>
      <MessageForm applicationId={applicationId} staff={staff} />
    </Panel>
  );
}

export function ActivityPanel({ activity }: { activity: ActivityRow[] }) {
  return (
    <Panel title="Activity">
      <ol className="space-y-3">
        {activity.map((a) => (
          <li key={a.id} className="border-l-2 border-gold-500/60 pl-3">
            <div className="text-sm font-medium">{a.action}</div>
            {a.detail && <div className="text-xs text-navy-900/60">{a.detail}</div>}
            <div className="text-[11px] text-navy-900/40">{a.actor_name ?? "System"} · {dateTime(a.created_at)}</div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

export function ApplicationDataView({ loanType, data }: { loanType: LoanType; data: ApplicationData }) {
  const steps = STEPS.filter((s) => !s.show || s.show(loanType));
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {steps.map((s) => (
        <div key={s.id}>
          <h3 className="mb-2 text-xs font-bold tracking-wide text-navy-700 uppercase">{s.title}</h3>
          <dl className="text-sm">
            {visibleFields(s, loanType, data, false).map((f) => {
              const v = (data[f.section] as Record<string, unknown> | undefined)?.[f.key];
              let shown = "—";
              if (v !== undefined && v !== "") {
                if (f.type === "bool") shown = v ? "Yes" : "No";
                else if (f.type === "money") shown = `$${Number(v).toLocaleString()}`;
                else if (f.type === "percent") shown = `${v}%`;
                else if (f.type === "select") shown = f.options?.find(([k]) => k === v)?.[1] ?? String(v);
                else shown = String(v);
              }
              return (
                <div key={f.key} className="flex justify-between gap-4 border-b border-navy-900/5 py-1">
                  <dt className="text-navy-900/60">{f.label}</dt>
                  <dd className="text-right font-medium">{shown}</dd>
                </div>
              );
            })}
          </dl>
        </div>
      ))}
    </div>
  );
}
