"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getApplication, logActivity, runUnderwriting } from "@/lib/applications";
import { STATUS_LABELS, type Status } from "@/lib/status";
import { DOC_CATEGORIES } from "@/lib/underwriting/engine";

const STAFF = ["underwriter", "admin"] as const;
const refresh = (id: string) => {
  revalidatePath(`/underwriter/applications/${id}`);
  revalidatePath(`/dashboard/applications/${id}`);
  revalidatePath("/underwriter");
};

/** Decisions an underwriter can record, mapped to the resulting pipeline status. */
const DECISION_STATUS: Record<string, Status> = {
  approve: "approved",
  conditional: "conditionally_approved",
  decline: "declined",
  request_info: "info_requested",
  in_review: "in_review",
  clear_to_close: "closing",
  closed: "closed",
};

export async function recordDecisionAction(_: unknown, formData: FormData): Promise<{ error?: string; ok?: string }> {
  const user = await requireUser([...STAFF]);
  const app = await getApplication(String(formData.get("applicationId") ?? ""));
  if (!app) return { error: "Application not found." };
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 4000);
  const status = DECISION_STATUS[decision];
  if (!status) return { error: "Choose a decision." };

  // An approval on a file the engine did not prequalify, or a decline on one it did, is an override.
  const engine = app.engine_decision;
  const overridden =
    (["approved", "conditionally_approved"].includes(status) && engine === "MANUAL_REVIEW") ||
    (status === "declined" && (engine === "PREQUALIFIED" || engine === "CONDITIONALLY_ELIGIBLE"));
  if (overridden && note.length < 10) return { error: "Overriding the automated recommendation requires a written justification (10+ characters)." };
  if ((status === "declined" || status === "info_requested") && !note) return { error: "Add a note explaining this decision to the applicant." };

  const isFinal = ["approved", "conditionally_approved", "declined"].includes(status);
  await query(
    `UPDATE applications SET status = $2, updated_at = now(),
       final_decision = CASE WHEN $3 THEN $2 ELSE final_decision END,
       final_decision_note = CASE WHEN $3 THEN $4 ELSE final_decision_note END,
       final_decision_by = CASE WHEN $3 THEN $5::uuid ELSE final_decision_by END,
       final_decision_at = CASE WHEN $3 THEN now() ELSE final_decision_at END,
       overridden = overridden OR $6,
       assigned_to = COALESCE(assigned_to, $5::uuid)
     WHERE id = $1`,
    [app.id, status, isFinal, note || null, user.id, overridden],
  );
  if (note && status !== "in_review") {
    await query("INSERT INTO messages (application_id, sender_id, body, internal) VALUES ($1, $2, $3, false)", [
      app.id,
      user.id,
      `${STATUS_LABELS[status]}: ${note}`,
    ]);
  }
  await logActivity(app.id, user.id, `Status set to ${STATUS_LABELS[status]}${overridden ? " (override of automated recommendation)" : ""}`, note || undefined);
  refresh(app.id);
  return { ok: `Status updated to ${STATUS_LABELS[status]}.` };
}

export async function rerunEngineAction(applicationId: string) {
  const user = await requireUser([...STAFF]);
  const app = await getApplication(applicationId);
  if (!app) return;
  await runUnderwriting(app, user.id);
  refresh(app.id);
}

export async function assignToMeAction(applicationId: string) {
  const user = await requireUser([...STAFF]);
  const app = await getApplication(applicationId);
  if (!app) return;
  await query(
    "UPDATE applications SET assigned_to = $2, status = CASE WHEN status = 'submitted' THEN 'in_review' ELSE status END, updated_at = now() WHERE id = $1",
    [app.id, user.id],
  );
  await logActivity(app.id, user.id, `Assigned to ${user.fullName}`);
  refresh(app.id);
}

export async function addConditionAction(_: unknown, formData: FormData): Promise<{ error?: string; ok?: string }> {
  const user = await requireUser([...STAFF]);
  const app = await getApplication(String(formData.get("applicationId") ?? ""));
  if (!app) return { error: "Application not found." };
  const description = String(formData.get("description") ?? "").trim().slice(0, 1000);
  const category = String(formData.get("category") ?? "other");
  if (!description) return { error: "Describe the condition." };
  await query("INSERT INTO conditions (application_id, source, description, doc_category) VALUES ($1, 'underwriter', $2, $3)", [
    app.id,
    description,
    category in DOC_CATEGORIES ? category : "other",
  ]);
  await logActivity(app.id, user.id, "Condition added", description);
  refresh(app.id);
  return { ok: "Condition added." };
}

export async function setConditionStatusAction(conditionId: string, applicationId: string, status: string) {
  const user = await requireUser([...STAFF]);
  if (!["open", "satisfied", "waived"].includes(status)) return;
  await query(
    "UPDATE conditions SET status = $3, resolved_at = CASE WHEN $3 = 'open' THEN NULL ELSE now() END WHERE id = $1 AND application_id = $2",
    [conditionId, applicationId, status],
  );
  await logActivity(applicationId, user.id, `Condition marked ${status}`);
  refresh(applicationId);
}

export async function reviewDocumentAction(documentId: string, applicationId: string, status: string, note?: string) {
  const user = await requireUser([...STAFF]);
  if (!["pending", "accepted", "rejected"].includes(status)) return;
  await query("UPDATE documents SET status = $3, review_note = $4 WHERE id = $1 AND application_id = $2", [
    documentId,
    applicationId,
    status,
    note ?? null,
  ]);
  await logActivity(applicationId, user.id, `Document ${status}`, note);
  refresh(applicationId);
}

