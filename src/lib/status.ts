export const STATUSES = [
  "draft",
  "submitted",
  "in_review",
  "info_requested",
  "conditionally_approved",
  "approved",
  "closing",
  "closed",
  "declined",
  "withdrawn",
] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  draft: "Draft",
  submitted: "Submitted",
  in_review: "In Underwriting",
  info_requested: "Information Requested",
  conditionally_approved: "Conditionally Approved",
  approved: "Approved",
  closing: "Clear to Close",
  closed: "Closed / Funded",
  declined: "Declined",
  withdrawn: "Withdrawn",
};

/** Milestones shown on the applicant's progress tracker. */
export const MILESTONES: { key: string; label: string; statuses: Status[] }[] = [
  { key: "application", label: "Application", statuses: ["draft"] },
  { key: "prequal", label: "Automated Prequalification", statuses: ["submitted"] },
  { key: "underwriting", label: "Underwriting Review", statuses: ["in_review", "info_requested"] },
  { key: "approval", label: "Approval", statuses: ["conditionally_approved", "approved"] },
  { key: "closing", label: "Closing", statuses: ["closing", "closed"] },
];

export function milestoneIndex(status: Status) {
  const i = MILESTONES.findIndex((m) => m.statuses.includes(status));
  return i === -1 ? 0 : i;
}

/** Applicants may edit their application only in these states. */
export const EDITABLE_STATUSES: Status[] = ["draft", "info_requested"];

export const TERMINAL_STATUSES: Status[] = ["closed", "declined", "withdrawn"];
