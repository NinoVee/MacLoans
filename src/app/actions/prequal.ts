"use server";

import { getGuidelines, isLoanType } from "@/lib/applications";
import { underwrite } from "@/lib/underwriting/engine";
import { DEFAULT_GUIDELINES } from "@/lib/underwriting/guidelines";
import { sanitizeApplicationData } from "@/lib/underwriting/sanitize";
import type { UnderwritingResult } from "@/lib/underwriting/types";

/** Anonymous instant prequalification — nothing is stored. */
export async function quickPrequalAction(loanType: string, rawData: unknown): Promise<UnderwritingResult | { error: string }> {
  if (!isLoanType(loanType)) return { error: "Choose a loan program." };
  let rules = DEFAULT_GUIDELINES[loanType];
  try {
    rules = await getGuidelines(loanType);
  } catch {
    // Database unavailable: fall back to the published default guidelines.
  }
  return underwrite(loanType, sanitizeApplicationData(rawData), rules);
}
