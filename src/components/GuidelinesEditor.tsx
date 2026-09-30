"use client";

import { useActionState } from "react";
import { saveGuidelinesAction } from "@/app/actions/admin";
import type { GuidelineRules, LoanType } from "@/lib/underwriting/types";

const NUMERIC: [keyof GuidelineRules, string, string?][] = [
  ["minCreditScore", "Min credit score"],
  ["maxLtv", "Max LTV", "%"],
  ["maxLtc", "Max LTC", "%"],
  ["maxLtArv", "Max loan / completed value", "%"],
  ["maxFrontDti", "Max front-end DTI", "%"],
  ["maxBackDti", "Max back-end DTI", "%"],
  ["minDscr", "Min DSCR", "x"],
  ["minReserveMonths", "Min reserves", "months"],
  ["minLoanAmount", "Min loan amount", "$"],
  ["maxLoanAmount", "Max loan amount", "$"],
  ["minContingencyPct", "Min contingency", "% of hard"],
  ["maxTimelineMonths", "Max construction timeline", "months"],
  ["minCompletedProjects", "Min completed projects"],
  ["minYearsEmployed", "Min years employed"],
  ["maxLatePayments12Months", "Max late payments (12 mo)"],
];
const BOOLS: [keyof GuidelineRules, string][] = [
  ["requireLicensedContractor", "Require licensed contractor"],
  ["requirePermits", "Require permits"],
  ["requirePlans", "Require complete plans"],
  ["allowForeignNational", "Allow foreign nationals"],
];

export function GuidelinesEditor({ loanType, rules }: { loanType: LoanType; rules: GuidelineRules }) {
  const [state, action, pending] = useActionState<{ error?: string; ok?: string }, FormData>(saveGuidelinesAction, {});
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="loanType" value={loanType} />
      <div className="max-w-md">
        <label className="label">Program name</label>
        <input name="label" defaultValue={rules.label} className="input" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {NUMERIC.map(([k, label, unit]) => (
          <div key={k}>
            <label className="label">
              {label} {unit && <span className="font-normal normal-case text-navy-900/40">({unit})</span>}
            </label>
            <input name={k} defaultValue={(rules[k] as number | null) ?? ""} placeholder="Not applied" className="input" inputMode="decimal" />
          </div>
        ))}
        <div>
          <label className="label">Closing costs <span className="font-normal normal-case text-navy-900/40">(% of loan)</span></label>
          <input name="closingCostPct" defaultValue={rules.closingCostPct} className="input" inputMode="decimal" />
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        {BOOLS.map(([k, label]) => (
          <label key={k} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name={k} defaultChecked={!!rules[k]} className="h-4 w-4 accent-navy-900" /> {label}
          </label>
        ))}
      </div>
      <fieldset className="rounded-lg border border-navy-900/10 p-4">
        <legend className="px-2 text-xs font-bold tracking-wide text-navy-700 uppercase">Conditional-eligibility tolerance</legend>
        <p className="mb-3 text-xs text-navy-900/60">
          Applications within these margins of a limit are marked <em>Conditionally Eligible</em> instead of routed to manual review.
        </p>
        <div className="grid gap-4 sm:grid-cols-4">
          <div><label className="label">Credit points</label><input name="tol_creditScorePoints" defaultValue={rules.tolerance.creditScorePoints} className="input" /></div>
          <div><label className="label">Ratio (pct pts)</label><input name="tol_ratioPct" defaultValue={rules.tolerance.ratioPct} className="input" /></div>
          <div><label className="label">DSCR</label><input name="tol_dscr" defaultValue={rules.tolerance.dscr} className="input" /></div>
          <div><label className="label">Reserve months</label><input name="tol_reserveMonths" defaultValue={rules.tolerance.reserveMonths} className="input" /></div>
        </div>
      </fieldset>
      <div className="flex items-center gap-3">
        <button className="btn-gold" disabled={pending}>{pending ? "Saving…" : "Save guidelines"}</button>
        {state.error && <span className="text-sm text-rose-700">{state.error}</span>}
        {state.ok && <span className="text-sm text-emerald-700">{state.ok}</span>}
      </div>
    </form>
  );
}
