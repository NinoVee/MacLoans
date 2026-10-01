"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { isStaff, requireUser } from "@/lib/auth";
import { getAccessibleApplication, isLoanType, logActivity, runUnderwriting } from "@/lib/applications";
import { sanitizeApplicationData } from "@/lib/underwriting/sanitize";
import { EDITABLE_STATUSES } from "@/lib/status";
import { DOC_CATEGORIES } from "@/lib/underwriting/engine";

// Vercel caps serverless request bodies at 4.5 MB, so keep uploads safely under that.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/heic",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
]);

/** Create or update a draft. Returns the application id. */
export async function saveApplicationAction(id: string | null, loanType: string, rawData: unknown): Promise<{ id?: string; error?: string }> {
  const user = await requireUser(["applicant"]);
  if (!isLoanType(loanType)) return { error: "Choose a loan program." };
  const data = sanitizeApplicationData(rawData);

  if (!id) {
    const row = await queryOne<{ id: string }>(
      "INSERT INTO applications (applicant_id, loan_type, data) VALUES ($1, $2, $3) RETURNING id",
      [user.id, loanType, JSON.stringify(data)],
    );
    await logActivity(row!.id, user.id, "Application started");
    return { id: row!.id };
  }

  const app = await getAccessibleApplication(user, id);
  if (!app || app.applicant_id !== user.id) return { error: "Application not found." };
  if (!EDITABLE_STATUSES.includes(app.status)) return { error: "This application can no longer be edited." };
  await query("UPDATE applications SET loan_type = $2, data = $3, updated_at = now() WHERE id = $1", [id, loanType, JSON.stringify(data)]);
  return { id };
}

/** Save, run automated underwriting and move the file into the pipeline. */
export async function submitApplicationAction(id: string | null, loanType: string, rawData: unknown): Promise<{ error?: string }> {
  const user = await requireUser(["applicant"]);
  const saved = await saveApplicationAction(id, loanType, rawData);
  if (saved.error || !saved.id) return { error: saved.error ?? "Could not save application." };

  const app = await getAccessibleApplication(user, saved.id);
  if (!app) return { error: "Application not found." };
  const wasInfoRequested = app.status === "info_requested";
  await query(
    "UPDATE applications SET status = $2, submitted_at = COALESCE(submitted_at, now()), updated_at = now() WHERE id = $1",
    [app.id, wasInfoRequested ? "in_review" : "submitted"],
  );
  await logActivity(app.id, user.id, wasInfoRequested ? "Application updated and resubmitted" : "Application submitted");
  await runUnderwriting(app, user.id);
  redirect(`/dashboard/applications/${app.id}?submitted=1`);
}

export async function withdrawApplicationAction(id: string) {
  const user = await requireUser(["applicant"]);
  const app = await getAccessibleApplication(user, id);
  if (!app || app.applicant_id !== user.id) return;
  if (["closed", "declined", "withdrawn"].includes(app.status)) return;
  await query("UPDATE applications SET status = 'withdrawn', updated_at = now() WHERE id = $1", [id]);
  await logActivity(id, user.id, "Application withdrawn by applicant");
  revalidatePath(`/dashboard/applications/${id}`);
}

export async function uploadDocumentAction(_: unknown, formData: FormData): Promise<{ error?: string; ok?: string }> {
  const user = await requireUser();
  const applicationId = String(formData.get("applicationId") ?? "");
  const conditionId = String(formData.get("conditionId") ?? "") || null;
  const category = String(formData.get("category") ?? "other");
  const file = formData.get("file");

  const app = await getAccessibleApplication(user, applicationId);
  if (!app) return { error: "Application not found." };
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Files must be 4 MB or smaller. Split or compress larger PDFs." };
  if (file.type && !ALLOWED_TYPES.has(file.type)) return { error: "Unsupported file type. Upload a PDF, image, Word, Excel or CSV file." };
  if (!(category in DOC_CATEGORIES)) return { error: "Choose a document category." };

  const buf = Buffer.from(await file.arrayBuffer());
  await query(
    "INSERT INTO documents (application_id, uploaded_by, category, filename, content_type, size_bytes, content) VALUES ($1, $2, $3, $4, $5, $6, decode($7, 'base64'))",
    [app.id, user.id, category, file.name.slice(0, 200), file.type || "application/octet-stream", file.size, buf.toString("base64")],
  );
  if (conditionId) {
    await query("UPDATE conditions SET status = 'submitted' WHERE id = $1 AND application_id = $2 AND status = 'open'", [conditionId, app.id]);
  }
  await logActivity(app.id, user.id, "Document uploaded", `${DOC_CATEGORIES[category]}: ${file.name}`);
  revalidatePath(`/dashboard/applications/${app.id}`);
  revalidatePath(`/underwriter/applications/${app.id}`);
  return { ok: `Uploaded ${file.name}` };
}

export async function postMessageAction(_: unknown, formData: FormData): Promise<{ error?: string; ok?: string }> {
  const user = await requireUser();
  const applicationId = String(formData.get("applicationId") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, 5000);
  const internal = isStaff(user) && formData.get("internal") === "on";
  const app = await getAccessibleApplication(user, applicationId);
  if (!app) return { error: "Application not found." };
  if (!body) return { error: "Message cannot be empty." };
  await query("INSERT INTO messages (application_id, sender_id, body, internal) VALUES ($1, $2, $3, $4)", [app.id, user.id, body, internal]);
  revalidatePath(`/dashboard/applications/${app.id}`);
  revalidatePath(`/underwriter/applications/${app.id}`);
  return { ok: "Sent" };
}
