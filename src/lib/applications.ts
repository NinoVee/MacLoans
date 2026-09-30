import "server-only";
import { query, queryOne } from "./db";
import { isStaff, type SessionUser } from "./auth";
import { underwrite } from "./underwriting/engine";
import { DEFAULT_GUIDELINES, resolveGuidelines } from "./underwriting/guidelines";
import { LOAN_TYPES, type ApplicationData, type GuidelineRules, type LoanType, type UnderwritingResult } from "./underwriting/types";
import type { Status } from "./status";

export interface ApplicationRow {
  id: string;
  ref_number: string;
  applicant_id: string;
  loan_type: LoanType;
  status: Status;
  data: ApplicationData;
  engine_decision: string | null;
  engine_result: UnderwritingResult | null;
  engine_run_at: string | null;
  final_decision: string | null;
  final_decision_note: string | null;
  final_decision_at: string | null;
  overridden: boolean;
  assigned_to: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export function isLoanType(v: unknown): v is LoanType {
  return typeof v === "string" && (LOAN_TYPES as readonly string[]).includes(v);
}

export async function getGuidelines(loanType: LoanType): Promise<GuidelineRules> {
  const row = await queryOne<{ rules: Partial<GuidelineRules> }>("SELECT rules FROM lender_guidelines WHERE loan_type = $1", [loanType]);
  return resolveGuidelines(loanType, row?.rules);
}

export async function getAllGuidelines(): Promise<Record<LoanType, GuidelineRules>> {
  const rows = await query<{ loan_type: LoanType; rules: Partial<GuidelineRules> }>("SELECT loan_type, rules FROM lender_guidelines");
  const out = { ...DEFAULT_GUIDELINES };
  for (const r of rows) if (isLoanType(r.loan_type)) out[r.loan_type] = resolveGuidelines(r.loan_type, r.rules);
  return out;
}

export async function getApplication(id: string): Promise<ApplicationRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return queryOne<ApplicationRow>("SELECT * FROM applications WHERE id = $1", [id]);
}

/** Load an application the user is allowed to see, or null. */
export async function getAccessibleApplication(user: SessionUser, id: string) {
  const app = await getApplication(id);
  if (!app) return null;
  if (isStaff(user) || app.applicant_id === user.id) return app;
  return null;
}

export async function logActivity(applicationId: string, actorId: string | null, action: string, detail?: string) {
  await query("INSERT INTO activity (application_id, actor_id, action, detail) VALUES ($1, $2, $3, $4)", [applicationId, actorId, action, detail ?? null]);
}

/**
 * Run the rules engine against the stored application, persist the result, and replace
 * the open engine-generated conditions (underwriter-added conditions are left untouched).
 */
export async function runUnderwriting(app: ApplicationRow, actorId: string | null): Promise<UnderwritingResult> {
  const rules = await getGuidelines(app.loan_type);
  const result = underwrite(app.loan_type, app.data, rules);
  await query(
    "UPDATE applications SET engine_decision = $2, engine_result = $3, engine_run_at = now(), updated_at = now() WHERE id = $1",
    [app.id, result.decision, JSON.stringify(result)],
  );

  // Keep conditions already satisfied/waived/submitted; refresh the open engine ones.
  const existing = await query<{ code: string | null; status: string }>(
    "SELECT code, status FROM conditions WHERE application_id = $1 AND source = 'engine'",
    [app.id],
  );
  await query("DELETE FROM conditions WHERE application_id = $1 AND source = 'engine' AND status = 'open'", [app.id]);
  const kept = new Set(existing.filter((c) => c.status !== "open").map((c) => c.code));
  for (const c of result.conditions) {
    if (kept.has(c.code)) continue;
    await query(
      "INSERT INTO conditions (application_id, source, code, description, doc_category) VALUES ($1, 'engine', $2, $3, $4)",
      [app.id, c.code, c.description, c.docCategory],
    );
  }
  await logActivity(app.id, actorId, "Automated underwriting run", result.summary);
  return result;
}

export interface ConditionRow {
  id: string;
  source: "engine" | "underwriter";
  code: string | null;
  description: string;
  doc_category: string | null;
  status: "open" | "submitted" | "satisfied" | "waived";
  created_at: string;
}
export interface DocumentRow {
  id: string;
  category: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  status: "pending" | "accepted" | "rejected";
  review_note: string | null;
  created_at: string;
  uploader_name: string;
}
export interface MessageRow {
  id: string;
  body: string;
  internal: boolean;
  created_at: string;
  sender_name: string;
  sender_role: string;
}
export interface ActivityRow {
  id: string;
  action: string;
  detail: string | null;
  created_at: string;
  actor_name: string | null;
}

export async function getApplicationDetail(applicationId: string, includeInternal: boolean) {
  const [conditions, documents, messages, activity] = await Promise.all([
    query<ConditionRow>(
      `SELECT id, source, code, description, doc_category, status, created_at FROM conditions WHERE application_id = $1
       ORDER BY CASE status WHEN 'open' THEN 0 WHEN 'submitted' THEN 1 ELSE 2 END, source DESC, created_at`,
      [applicationId],
    ),
    query<DocumentRow>(
      `SELECT d.id, d.category, d.filename, d.content_type, d.size_bytes, d.status, d.review_note, d.created_at, u.full_name AS uploader_name
       FROM documents d JOIN users u ON u.id = d.uploaded_by WHERE d.application_id = $1 ORDER BY d.created_at DESC`,
      [applicationId],
    ),
    query<MessageRow>(
      `SELECT m.id, m.body, m.internal, m.created_at, u.full_name AS sender_name, u.role AS sender_role
       FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.application_id = $1 AND ($2 OR NOT m.internal) ORDER BY m.created_at`,
      [applicationId, includeInternal],
    ),
    query<ActivityRow>(
      `SELECT a.id, a.action, a.detail, a.created_at, u.full_name AS actor_name
       FROM activity a LEFT JOIN users u ON u.id = a.actor_id WHERE a.application_id = $1 ORDER BY a.created_at DESC LIMIT 100`,
      [applicationId],
    ),
  ]);
  return { conditions, documents, messages, activity };
}
