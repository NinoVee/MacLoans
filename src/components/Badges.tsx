import { DECISION_LABELS, type Decision } from "@/lib/underwriting/types";
import { STATUS_LABELS, type Status } from "@/lib/status";

const DECISION_STYLES: Record<Decision, string> = {
  PREQUALIFIED: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  CONDITIONALLY_ELIGIBLE: "bg-amber-100 text-amber-800 ring-amber-600/20",
  ADDITIONAL_INFO_REQUIRED: "bg-sky-100 text-sky-800 ring-sky-600/20",
  MANUAL_REVIEW: "bg-rose-100 text-rose-800 ring-rose-600/20",
};

const STATUS_STYLES: Partial<Record<Status, string>> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-sky-100 text-sky-800",
  in_review: "bg-indigo-100 text-indigo-800",
  info_requested: "bg-amber-100 text-amber-800",
  conditionally_approved: "bg-teal-100 text-teal-800",
  approved: "bg-emerald-100 text-emerald-800",
  closing: "bg-emerald-100 text-emerald-800",
  closed: "bg-navy-900 text-gold-300",
  declined: "bg-rose-100 text-rose-800",
  withdrawn: "bg-slate-100 text-slate-500",
};

export function DecisionBadge({ decision, large = false }: { decision: string | null | undefined; large?: boolean }) {
  if (!decision || !(decision in DECISION_LABELS)) return <span className="text-xs text-navy-900/40">Not run</span>;
  const d = decision as Decision;
  return (
    <span className={`inline-flex items-center rounded-full font-semibold ring-1 ring-inset ${DECISION_STYLES[d]} ${large ? "px-4 py-1.5 text-sm" : "px-2.5 py-0.5 text-xs"}`}>
      {DECISION_LABELS[d]}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = status as Status;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[s] ?? "bg-slate-100"}`}>
      {STATUS_LABELS[s] ?? status}
    </span>
  );
}

const CONDITION_STYLES: Record<string, string> = {
  open: "bg-amber-100 text-amber-800",
  submitted: "bg-sky-100 text-sky-800",
  satisfied: "bg-emerald-100 text-emerald-800",
  waived: "bg-slate-100 text-slate-600",
  pending: "bg-slate-100 text-slate-700",
  accepted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
};

export function PillBadge({ value }: { value: string }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${CONDITION_STYLES[value] ?? "bg-slate-100"}`}>{value}</span>;
}
