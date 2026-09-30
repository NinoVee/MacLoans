"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isLoanType } from "@/lib/applications";
import { DEFAULT_GUIDELINES } from "@/lib/underwriting/guidelines";
import type { GuidelineRules } from "@/lib/underwriting/types";

const NUMERIC_RULES = [
  "minCreditScore", "maxLtv", "maxLtc", "maxLtArv", "maxFrontDti", "maxBackDti", "minDscr", "minReserveMonths",
  "minLoanAmount", "maxLoanAmount", "minContingencyPct", "maxTimelineMonths", "minCompletedProjects",
  "minYearsEmployed", "maxLatePayments12Months",
] as const;
const BOOLEAN_RULES = ["requireLicensedContractor", "requirePermits", "requirePlans", "allowForeignNational"] as const;

function num(v: FormDataEntryValue | null): number | null {
  if (v === null || String(v).trim() === "") return null;
  const x = Number(String(v).replace(/[$,%\s]/g, ""));
  return Number.isFinite(x) && x >= 0 ? x : null;
}

export async function saveGuidelinesAction(_: unknown, formData: FormData): Promise<{ error?: string; ok?: string }> {
  const user = await requireUser(["admin"]);
  const loanType = String(formData.get("loanType") ?? "");
  if (!isLoanType(loanType)) return { error: "Unknown loan program." };
  const d = DEFAULT_GUIDELINES[loanType];

  const rules: GuidelineRules = {
    ...d,
    label: String(formData.get("label") ?? "").trim() || d.label,
    closingCostPct: num(formData.get("closingCostPct")) ?? d.closingCostPct,
    tolerance: {
      creditScorePoints: num(formData.get("tol_creditScorePoints")) ?? 0,
      ratioPct: num(formData.get("tol_ratioPct")) ?? 0,
      dscr: num(formData.get("tol_dscr")) ?? 0,
      reserveMonths: num(formData.get("tol_reserveMonths")) ?? 0,
    },
  };
  for (const k of NUMERIC_RULES) rules[k] = num(formData.get(k));
  for (const k of BOOLEAN_RULES) rules[k] = formData.get(k) === "on";
  if (rules.minLoanAmount !== null && rules.maxLoanAmount !== null && rules.minLoanAmount > rules.maxLoanAmount)
    return { error: "Minimum loan amount cannot exceed the maximum." };

  await query(
    `INSERT INTO lender_guidelines (loan_type, rules, updated_by, updated_at) VALUES ($1, $2, $3, now())
     ON CONFLICT (loan_type) DO UPDATE SET rules = EXCLUDED.rules, updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [loanType, JSON.stringify(rules), user.id],
  );
  revalidatePath("/admin/guidelines");
  return { ok: `${rules.label} guidelines saved. New submissions and re-runs will use them.` };
}

export async function resetGuidelinesAction(loanType: string) {
  await requireUser(["admin"]);
  if (!isLoanType(loanType)) return;
  await query("DELETE FROM lender_guidelines WHERE loan_type = $1", [loanType]);
  revalidatePath("/admin/guidelines");
}

export async function setUserRoleAction(userId: string, role: string) {
  const admin = await requireUser(["admin"]);
  if (!["applicant", "underwriter", "admin"].includes(role) || userId === admin.id) return;
  await query("UPDATE users SET role = $2 WHERE id = $1", [userId, role]);
  revalidatePath("/admin/users");
}
