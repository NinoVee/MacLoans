import { isConstruction, type LoanType, type UnderwritingResult } from "@/lib/underwriting/types";
import { pct, ratio, usd } from "@/lib/format";
import { DecisionBadge } from "./Badges";

const SEVERITY: Record<string, { icon: string; cls: string; label: string }> = {
  pass: { icon: "✓", cls: "bg-emerald-100 text-emerald-700", label: "Meets guideline" },
  condition: { icon: "!", cls: "bg-amber-100 text-amber-700", label: "Condition" },
  fail: { icon: "✕", cls: "bg-rose-100 text-rose-700", label: "Outside guideline" },
  missing: { icon: "?", cls: "bg-sky-100 text-sky-700", label: "Missing" },
};

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-navy-900/10 bg-cream/60 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-navy-700/80">{label}</div>
      <div className="mt-1 text-lg font-bold text-navy-900">{value}</div>
      {hint && <div className="text-[11px] text-navy-900/50">{hint}</div>}
    </div>
  );
}

export function MetricsGrid({ loanType, result }: { loanType: LoanType; result: UnderwritingResult }) {
  const m = result.metrics;
  const items: { label: string; value: string; hint?: string; show: boolean }[] = [
    { label: "Loan Amount", value: usd(m.loanAmount), show: true },
    { label: isConstruction(loanType) ? "Completed Value" : "Property Value", value: usd(m.propertyValue), show: true },
    { label: "LTV", value: pct(m.ltv), hint: "Loan-to-value", show: m.ltv !== null },
    { label: "LTC", value: pct(m.ltc), hint: "Loan-to-cost", show: m.ltc !== null },
    { label: "Loan / Completed Value", value: pct(m.ltArv), show: m.ltArv !== null },
    { label: "Total Project Cost", value: usd(m.totalProjectCost), show: m.totalProjectCost !== null },
    { label: "Contingency", value: pct(m.contingencyPct), hint: "of hard costs", show: m.contingencyPct !== null && isConstruction(loanType) },
    { label: loanType === "construction" ? "Interest-Only Payment" : "Principal & Interest", value: usd(m.monthlyPrincipalInterest), hint: "per month", show: m.monthlyPrincipalInterest !== null },
    { label: "Total Housing Payment", value: usd(m.monthlyHousingPayment), hint: "PITIA per month", show: m.monthlyHousingPayment !== null && m.monthlyHousingPayment !== m.monthlyPrincipalInterest },
    { label: "Gross Monthly Income", value: usd(m.grossMonthlyIncome), show: m.grossMonthlyIncome !== null },
    { label: "Front-End DTI", value: pct(m.frontDti), show: m.frontDti !== null && loanType === "residential" },
    { label: "Back-End DTI", value: pct(m.backDti), show: m.backDti !== null && (loanType === "residential" || loanType === "construction_perm") },
    { label: "NOI (annual)", value: usd(m.netOperatingIncomeAnnual), show: m.netOperatingIncomeAnnual !== null },
    { label: "DSCR", value: ratio(m.dscr), hint: "Debt-service coverage", show: m.dscr !== null },
    { label: isConstruction(loanType) ? "Borrower Equity Required" : "Down Payment", value: usd(m.downPayment), show: m.downPayment !== null },
    { label: "Est. Closing Costs", value: usd(m.estimatedClosingCosts), show: m.estimatedClosingCosts !== null },
    { label: "Required Cash Contribution", value: usd(m.requiredCashContribution), show: m.requiredCashContribution !== null },
    { label: "Reserves After Closing", value: usd(m.reservesAfterClose), hint: m.reserveMonths !== null ? `${m.reserveMonths} months` : undefined, show: m.reservesAfterClose !== null },
    { label: "Available Equity", value: usd(m.availableEquity), show: m.availableEquity !== null },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.filter((i) => i.show).map((i) => (
        <Metric key={i.label} label={i.label} value={i.value} hint={i.hint} />
      ))}
    </div>
  );
}

export function FindingsList({ result }: { result: UnderwritingResult }) {
  const order = { fail: 0, missing: 1, condition: 2, pass: 3 };
  const findings = [...result.findings].sort((a, b) => order[a.severity] - order[b.severity]);
  return (
    <ul className="divide-y divide-navy-900/5">
      {findings.map((f, i) => {
        const s = SEVERITY[f.severity];
        return (
          <li key={`${f.code}-${i}`} className="flex gap-3 py-2.5">
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${s.cls}`} title={s.label}>
              {s.icon}
            </span>
            <div>
              <div className="text-sm font-semibold">{f.label}</div>
              <div className="text-sm text-navy-900/70">{f.message}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function UnderwritingReport({ loanType, result }: { loanType: LoanType; result: UnderwritingResult }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="eyebrow">Preliminary Result</div>
          <div className="mt-2">
            <DecisionBadge decision={result.decision} large />
          </div>
        </div>
        <div className="text-xs text-navy-900/50">
          Engine v{result.engineVersion} · {new Date(result.evaluatedAt).toLocaleString()}
        </div>
      </div>
      <p className="text-sm leading-relaxed text-navy-900/80">{result.summary}</p>
      <div>
        <h3 className="mb-3 font-serif text-lg font-bold">Key Metrics</h3>
        <MetricsGrid loanType={loanType} result={result} />
      </div>
      <div>
        <h3 className="mb-1 font-serif text-lg font-bold">What Affected This Result</h3>
        <FindingsList result={result} />
      </div>
    </div>
  );
}
