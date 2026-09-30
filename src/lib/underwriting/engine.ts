import {
  DECISION_LABELS,
  isConstruction,
  type ApplicationData,
  type Decision,
  type Finding,
  type GuidelineRules,
  type LoanType,
  type Metrics,
  type RequiredCondition,
  type UnderwritingResult,
} from "./types";

export const ENGINE_VERSION = "1.0.0";

export const DOC_CATEGORIES: Record<string, string> = {
  identification: "Government-issued ID",
  income: "Income documentation",
  assets: "Asset / bank statements",
  credit: "Credit explanation",
  property: "Property information",
  leases: "Leases / rent roll",
  operating: "Operating statements",
  construction_budget: "Construction budget",
  contractor: "Contractor documents",
  plans: "Plans & specifications",
  permits: "Permits",
  entity: "Entity documents",
  insurance: "Insurance",
  other: "Other",
};

const n = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const round = (v: number | null, dp = 2) => (v === null || !Number.isFinite(v) ? null : Math.round(v * 10 ** dp) / 10 ** dp);
const pct = (num: number | null, den: number | null) => (num === null || den === null || den <= 0 ? null : (num / den) * 100);
const usd = (v: number) => v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Standard monthly principal & interest payment. */
export function monthlyPayment(principal: number, annualRatePct: number, months: number, interestOnly = false): number {
  const r = annualRatePct / 100 / 12;
  if (interestOnly) return principal * r;
  if (months <= 0) return 0;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

// ---------------------------------------------------------------------------------------------
// Required fields
// ---------------------------------------------------------------------------------------------

type FieldSpec = [path: string, label: string];

function requiredFields(loanType: LoanType, d: ApplicationData): FieldSpec[] {
  const f: FieldSpec[] = [
    ["borrower.creditScore", "Credit score"],
    ["borrower.liquidAssets", "Liquid assets"],
    ["loan.requestedAmount", "Requested loan amount"],
    ["loan.interestRate", "Interest rate"],
    ["loan.termMonths", "Loan term"],
    ["property.state", "Property state"],
  ];
  const purchase = (d.loan.purpose ?? "purchase") === "purchase";
  const valueField: FieldSpec = purchase ? ["property.purchasePrice", "Purchase price"] : ["property.estimatedValue", "Estimated property value"];
  const personalIncome: FieldSpec[] = [
    ["borrower.annualIncome", "Annual income"],
    ["borrower.monthlyDebts", "Monthly debt payments"],
  ];
  const carry: FieldSpec[] = [
    ["property.monthlyTaxes", "Monthly property taxes"],
    ["property.monthlyInsurance", "Monthly insurance"],
  ];
  const build: FieldSpec[] = [
    ["construction.hardCosts", "Hard construction costs"],
    ["construction.softCosts", "Soft costs"],
    ["construction.completedValue", "Projected completed value"],
    ["construction.timelineMonths", "Construction timeline"],
    d.construction?.landOwned ? ["construction.landValue", "Current land value"] : ["construction.landCost", "Land purchase price"],
  ];

  switch (loanType) {
    case "residential":
      return [...f, valueField, ...personalIncome, ...carry, ["property.occupancy", "Occupancy"]];
    case "investment":
      return [...f, valueField, ...carry, ["property.grossMonthlyRent", "Gross monthly rent"]];
    case "commercial":
      return [
        ...f,
        valueField,
        ["property.grossMonthlyRent", "Gross monthly rental income"],
        ["property.monthlyOperatingExpenses", "Monthly operating expenses"],
      ];
    case "construction":
      return [...f, ...build];
    case "land":
      return [...f, valueField];
    case "construction_perm":
      return [...f, ...build, ...personalIncome, ...carry];
  }
}

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}

function isBlank(v: unknown) {
  return v === undefined || v === null || v === "" || (typeof v === "number" && !Number.isFinite(v));
}

// ---------------------------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------------------------

export function computeMetrics(loanType: LoanType, d: ApplicationData, rules: GuidelineRules): Metrics {
  const b = d.borrower ?? {};
  const p = d.property ?? {};
  const l = d.loan ?? {};
  const c = d.construction ?? {};
  const purpose = l.purpose ?? "purchase";
  const loan = n(l.requestedAmount);
  const rate = n(l.interestRate);
  const term = n(l.termMonths);
  const amort = n(l.amortizationMonths) ?? term;

  // Property value: lesser of price and appraised/estimated value on purchases.
  let value: number | null;
  const price = n(p.purchasePrice);
  const est = n(p.estimatedValue);
  if (purpose === "purchase") value = price !== null && est !== null ? Math.min(price, est) : price ?? est;
  else value = est ?? price;

  // Construction project cost stack.
  let totalProjectCost: number | null = null;
  let contingencyPct: number | null = null;
  let completedValue: number | null = null;
  if (isConstruction(loanType)) {
    const land = c.landOwned ? n(c.landValue) : n(c.landCost);
    const hard = n(c.hardCosts);
    const soft = n(c.softCosts);
    if (land !== null && hard !== null && soft !== null) {
      totalProjectCost = land + hard + soft + (n(c.contingency) ?? 0) + (n(c.interestReserve) ?? 0);
    }
    contingencyPct = pct(n(c.contingency) ?? 0, hard);
    completedValue = n(c.completedValue);
    value = completedValue;
  }

  // Debt service.
  let pi: number | null = null;
  if (loan !== null && rate !== null) {
    if (loanType === "construction") pi = monthlyPayment(loan, rate, 0, true);
    else if (loanType === "construction_perm") pi = monthlyPayment(loan, rate, n(l.amortizationMonths) ?? 360, false);
    else if (amort !== null || l.interestOnly) pi = monthlyPayment(loan, rate, amort ?? 0, !!l.interestOnly);
  }
  const escrow = (n(p.monthlyTaxes) ?? 0) + (n(p.monthlyInsurance) ?? 0) + (n(p.monthlyHoa) ?? 0);
  const housing = pi === null ? null : pi + escrow;

  // Personal income ratios.
  const annual = n(b.annualIncome);
  const grossMonthlyIncome = annual === null && n(b.otherMonthlyIncome) === null ? null : (annual ?? 0) / 12 + (n(b.otherMonthlyIncome) ?? 0);
  const frontDti = housing !== null ? pct(housing, grossMonthlyIncome) : null;
  const backDti = housing !== null ? pct(housing + (n(b.monthlyDebts) ?? 0), grossMonthlyIncome) : null;

  // Property cash flow.
  const rent = n(p.grossMonthlyRent);
  let noi: number | null = null;
  let dscr: number | null = null;
  if (loanType === "commercial" && rent !== null) {
    noi = (rent - (n(p.monthlyOperatingExpenses) ?? 0)) * 12;
    if (pi && pi > 0) dscr = noi / (pi * 12);
  } else if (loanType === "investment" && rent !== null) {
    noi = (rent - escrow) * 12;
    if (housing && housing > 0) dscr = rent / housing;
  }

  // Cash to close.
  const closingCosts = loan !== null ? loan * (rules.closingCostPct / 100) : null;
  let downPayment: number | null = null;
  let requiredCash: number | null = null;
  if (isConstruction(loanType)) {
    if (totalProjectCost !== null && loan !== null) {
      const landEquity = c.landOwned ? n(c.landValue) ?? 0 : 0;
      downPayment = Math.max(0, totalProjectCost - loan - landEquity);
      requiredCash = downPayment + (closingCosts ?? 0);
    }
  } else if (loan !== null) {
    if (purpose === "purchase" && price !== null) {
      downPayment = Math.max(0, price - loan);
      requiredCash = downPayment + (closingCosts ?? 0);
    } else if (purpose !== "purchase") {
      requiredCash = Math.max(0, (n(p.existingLiens) ?? 0) + (closingCosts ?? 0) - loan);
    }
  }

  // Reserves: liquid assets plus 60% of retirement assets, after closing.
  const liquid = n(b.liquidAssets);
  const available = liquid === null ? null : liquid + 0.6 * (n(b.retirementAssets) ?? 0);
  const reservesAfterClose = available !== null && requiredCash !== null ? available - requiredCash : null;
  const monthlyCarry = housing ?? null;
  const reserveMonths = reservesAfterClose !== null && monthlyCarry && monthlyCarry > 0 ? reservesAfterClose / monthlyCarry : null;

  return {
    loanAmount: loan,
    propertyValue: value,
    ltv: round(pct(loan, isConstruction(loanType) ? null : value)),
    ltc: round(pct(loan, totalProjectCost)),
    ltArv: round(pct(loan, completedValue)),
    totalProjectCost: round(totalProjectCost),
    contingencyPct: round(contingencyPct),
    monthlyPrincipalInterest: round(pi),
    monthlyHousingPayment: round(housing),
    grossMonthlyIncome: round(grossMonthlyIncome),
    frontDti: round(frontDti),
    backDti: round(backDti),
    netOperatingIncomeAnnual: round(noi),
    dscr: round(dscr, 3),
    downPayment: round(downPayment),
    estimatedClosingCosts: round(closingCosts),
    requiredCashContribution: round(requiredCash),
    reservesAfterClose: round(reservesAfterClose),
    reserveMonths: round(reserveMonths, 1),
    availableEquity: round(value !== null && loan !== null ? value - loan : null),
  };
}

// ---------------------------------------------------------------------------------------------
// Rule evaluation
// ---------------------------------------------------------------------------------------------

function maxCheck(code: string, label: string, actual: number | null, limit: number | null, tol: number, unit = "%"): Finding | null {
  if (limit === null || actual === null) return null;
  const fmt = (v: number) => `${round(v)}${unit}`;
  if (actual <= limit) return { code, label, severity: "pass", actual, limit, message: `${label} of ${fmt(actual)} is within the ${fmt(limit)} maximum.` };
  if (actual <= limit + tol)
    return { code, label, severity: "condition", actual, limit, message: `${label} of ${fmt(actual)} is slightly above the ${fmt(limit)} maximum; may qualify with compensating factors or a reduced loan amount.` };
  return { code, label, severity: "fail", actual, limit, message: `${label} of ${fmt(actual)} exceeds the ${fmt(limit)} maximum.` };
}

function minCheck(code: string, label: string, actual: number | null, limit: number | null, tol: number, unit = ""): Finding | null {
  if (limit === null || actual === null) return null;
  const fmt = (v: number) => `${round(v, unit === "x" ? 2 : 1)}${unit}`;
  if (actual >= limit) return { code, label, severity: "pass", actual, limit, message: `${label} of ${fmt(actual)} meets the ${fmt(limit)} minimum.` };
  if (actual >= limit - tol)
    return { code, label, severity: "condition", actual, limit, message: `${label} of ${fmt(actual)} is slightly below the ${fmt(limit)} minimum; may qualify with compensating factors.` };
  return { code, label, severity: "fail", actual, limit, message: `${label} of ${fmt(actual)} is below the ${fmt(limit)} minimum.` };
}

const CONDITION_FOR_CODE: Record<string, { text: string; doc: string }> = {
  CREDIT_SCORE: { text: "Provide a tri-merge credit report and letters of explanation for derogatory items.", doc: "credit" },
  LATE_PAYMENTS: { text: "Provide a letter of explanation for recent late payments.", doc: "credit" },
  EMPLOYMENT_HISTORY: { text: "Document a 2-year employment/self-employment history (tax returns, VOE, or CPA letter).", doc: "income" },
  LTV: { text: "Increase down payment or reduce the loan amount to meet the maximum LTV.", doc: "assets" },
  LTC: { text: "Increase borrower equity in the project or reduce the loan to meet the maximum LTC.", doc: "construction_budget" },
  LT_ARV: { text: "Provide an as-completed appraisal supporting the projected completed value.", doc: "property" },
  FRONT_DTI: { text: "Provide compensating factors (reserves, residual income) for the housing ratio.", doc: "income" },
  BACK_DTI: { text: "Pay down or document payoff of revolving/installment debt to reduce DTI.", doc: "income" },
  DSCR: { text: "Provide executed leases / rent roll and operating statements supporting the rental income.", doc: "leases" },
  RESERVES: { text: "Document additional liquid reserves (two most recent months of statements).", doc: "assets" },
  FUNDS_TO_CLOSE: { text: "Document sufficient funds to close (bank/brokerage statements, gift letter).", doc: "assets" },
  CONTINGENCY: { text: "Revise the construction budget to include an adequate contingency reserve.", doc: "construction_budget" },
  TIMELINE: { text: "Provide a detailed construction schedule supporting the project timeline.", doc: "construction_budget" },
  CONTRACTOR_LICENSE: { text: "Provide the general contractor's license, insurance certificate and signed contract.", doc: "contractor" },
  PERMITS: { text: "Provide approved building permits prior to the first draw.", doc: "permits" },
  PLANS: { text: "Provide final architectural plans and specifications.", doc: "plans" },
  EXPERIENCE: { text: "Provide a schedule of real estate owned / completed projects (track record).", doc: "other" },
  PROJECT_FEASIBILITY: { text: "Provide a revised budget or valuation — projected value does not cover total project cost.", doc: "construction_budget" },
  LOAN_AMOUNT: { text: "Requested amount is outside program limits; loan amount must be restructured.", doc: "other" },
};

function standardConditions(loanType: LoanType, d: ApplicationData): RequiredCondition[] {
  const s: RequiredCondition[] = [
    { code: "STD_ID", description: "Government-issued photo ID for all borrowers/guarantors.", docCategory: "identification" },
    { code: "STD_ASSETS", description: "Two most recent months of bank/asset statements.", docCategory: "assets" },
  ];
  const personal = loanType === "residential" || loanType === "construction_perm";
  if (personal) {
    s.push(
      d.borrower?.employmentType === "self_employed"
        ? { code: "STD_INCOME", description: "Two years of personal and business tax returns, plus YTD P&L.", docCategory: "income" }
        : { code: "STD_INCOME", description: "Most recent 30 days of pay stubs and two years of W-2s.", docCategory: "income" },
    );
  }
  if (loanType === "investment") s.push({ code: "STD_LEASES", description: "Current lease agreements or market rent analysis.", docCategory: "leases" });
  if (loanType === "commercial") {
    s.push({ code: "STD_RENT_ROLL", description: "Current rent roll and trailing-12-month operating statement.", docCategory: "operating" });
    s.push({ code: "STD_ENTITY", description: "Borrowing entity formation documents and operating agreement.", docCategory: "entity" });
  }
  if (isConstruction(loanType)) {
    s.push({ code: "STD_BUDGET", description: "Line-item construction budget and draw schedule.", docCategory: "construction_budget" });
    s.push({ code: "STD_CONTRACT", description: "Executed construction contract with the general contractor.", docCategory: "contractor" });
  }
  if (loanType !== "land" && d.loan?.purpose !== "purchase") {
    s.push({ code: "STD_MORTGAGE_STMT", description: "Most recent mortgage statement(s) for existing liens.", docCategory: "property" });
  }
  if (d.loan?.purpose === "purchase" || loanType === "land") {
    s.push({ code: "STD_CONTRACT_OF_SALE", description: "Fully executed purchase contract.", docCategory: "property" });
  }
  return s;
}

/**
 * Run automated underwriting for a single application against a lender's guidelines.
 * Pure function — no I/O — so it can run on the server, in tests, or in the browser.
 */
export function underwrite(loanType: LoanType, data: ApplicationData, rules: GuidelineRules, now = new Date()): UnderwritingResult {
  const d: ApplicationData = {
    borrower: data.borrower ?? {},
    property: data.property ?? {},
    loan: data.loan ?? {},
    construction: data.construction ?? {},
  };
  const b = d.borrower;
  const c = d.construction!;
  const t = rules.tolerance;
  const m = computeMetrics(loanType, d, rules);
  const findings: Finding[] = [];
  const push = (f: Finding | null) => f && findings.push(f);

  // Missing data
  const missingFields = requiredFields(loanType, d)
    .filter(([path]) => isBlank(getPath(d, path)))
    .map(([, label]) => label);
  for (const label of missingFields) {
    findings.push({ code: "MISSING", label, severity: "missing", message: `${label} is required to complete the analysis.` });
  }

  // Program limits
  if (m.loanAmount !== null) {
    if (rules.minLoanAmount !== null && m.loanAmount < rules.minLoanAmount)
      push({ code: "LOAN_AMOUNT", label: "Loan amount", severity: "fail", actual: m.loanAmount, limit: rules.minLoanAmount, message: `Requested ${usd(m.loanAmount)} is below the ${usd(rules.minLoanAmount)} program minimum.` });
    else if (rules.maxLoanAmount !== null && m.loanAmount > rules.maxLoanAmount)
      push({ code: "LOAN_AMOUNT", label: "Loan amount", severity: "fail", actual: m.loanAmount, limit: rules.maxLoanAmount, message: `Requested ${usd(m.loanAmount)} exceeds the ${usd(rules.maxLoanAmount)} program maximum.` });
    else push({ code: "LOAN_AMOUNT", label: "Loan amount", severity: "pass", actual: m.loanAmount, message: `Requested ${usd(m.loanAmount)} is within program limits.` });
  }

  // Credit
  push(minCheck("CREDIT_SCORE", "Credit score", n(b.creditScore), rules.minCreditScore, t.creditScorePoints));
  if (b.bankruptcyLast4Years)
    push({ code: "BANKRUPTCY", label: "Bankruptcy", severity: "fail", message: "Bankruptcy within the last 4 years requires manual underwriter review." });
  if (b.foreclosureLast7Years)
    push({ code: "FORECLOSURE", label: "Foreclosure", severity: "fail", message: "Foreclosure or short sale within the last 7 years requires manual underwriter review." });
  const lates = n(b.latePaymentsLast12Months);
  if (rules.maxLatePayments12Months !== null && lates !== null && lates > rules.maxLatePayments12Months)
    push({ code: "LATE_PAYMENTS", label: "Recent late payments", severity: lates > rules.maxLatePayments12Months + 2 ? "fail" : "condition", actual: lates, limit: rules.maxLatePayments12Months, message: `${lates} late payment(s) in the last 12 months (maximum ${rules.maxLatePayments12Months}).` });
  if (b.citizenship === "foreign_national" && !rules.allowForeignNational)
    push({ code: "CITIZENSHIP", label: "Borrower residency", severity: "fail", message: "Foreign national borrowers are not eligible under automated guidelines for this program." });

  // Employment
  const yrs = n(b.yearsEmployed);
  if (rules.minYearsEmployed !== null && yrs !== null && b.employmentType !== "retired") {
    push(
      yrs >= rules.minYearsEmployed
        ? { code: "EMPLOYMENT_HISTORY", label: "Employment history", severity: "pass", actual: yrs, limit: rules.minYearsEmployed, message: `${yrs} years of employment history meets the ${rules.minYearsEmployed}-year requirement.` }
        : { code: "EMPLOYMENT_HISTORY", label: "Employment history", severity: "condition", actual: yrs, limit: rules.minYearsEmployed, message: `${yrs} years of employment history is less than the ${rules.minYearsEmployed}-year standard; additional documentation required.` },
    );
  }

  // Leverage
  push(maxCheck("LTV", "Loan-to-value (LTV)", m.ltv, rules.maxLtv, t.ratioPct));
  push(maxCheck("LTC", "Loan-to-cost (LTC)", m.ltc, rules.maxLtc, t.ratioPct));
  push(maxCheck("LT_ARV", "Loan-to-completed-value", m.ltArv, rules.maxLtArv, t.ratioPct));

  // Capacity
  if (rules.maxFrontDti !== null && m.frontDti !== null) {
    const f = maxCheck("FRONT_DTI", "Housing ratio (front-end DTI)", m.frontDti, rules.maxFrontDti, t.ratioPct)!;
    // The housing ratio alone never forces manual review; it is offset by compensating factors.
    if (f.severity === "fail") f.severity = "condition";
    push(f);
  }
  push(maxCheck("BACK_DTI", "Debt-to-income (DTI)", m.backDti, rules.maxBackDti, t.ratioPct));
  push(minCheck("DSCR", "Debt-service coverage (DSCR)", m.dscr, rules.minDscr, t.dscr, "x"));

  // Liquidity
  if (m.reservesAfterClose !== null && m.reservesAfterClose < 0) {
    push({ code: "FUNDS_TO_CLOSE", label: "Funds to close", severity: "fail", actual: m.reservesAfterClose, message: `Documented assets are ${usd(-m.reservesAfterClose)} short of the estimated ${usd(m.requiredCashContribution ?? 0)} required cash contribution.` });
  } else {
    push(minCheck("RESERVES", "Post-closing reserves", m.reserveMonths, rules.minReserveMonths, t.reserveMonths, " mo"));
  }

  // Construction project
  if (isConstruction(loanType)) {
    if (m.totalProjectCost !== null && m.propertyValue !== null) {
      push(
        m.propertyValue >= m.totalProjectCost
          ? { code: "PROJECT_FEASIBILITY", label: "Project feasibility", severity: "pass", actual: m.propertyValue, limit: m.totalProjectCost, message: `Projected completed value of ${usd(m.propertyValue)} exceeds total project cost of ${usd(m.totalProjectCost)} (projected margin ${usd(m.propertyValue - m.totalProjectCost)}).` }
          : { code: "PROJECT_FEASIBILITY", label: "Project feasibility", severity: "fail", actual: m.propertyValue, limit: m.totalProjectCost, message: `Projected completed value of ${usd(m.propertyValue)} is less than total project cost of ${usd(m.totalProjectCost)}.` },
      );
    }
    if (rules.minContingencyPct !== null && m.contingencyPct !== null) {
      push(
        m.contingencyPct >= rules.minContingencyPct
          ? { code: "CONTINGENCY", label: "Contingency reserve", severity: "pass", actual: m.contingencyPct, limit: rules.minContingencyPct, message: `Contingency of ${m.contingencyPct}% of hard costs meets the ${rules.minContingencyPct}% minimum.` }
          : { code: "CONTINGENCY", label: "Contingency reserve", severity: "condition", actual: m.contingencyPct, limit: rules.minContingencyPct, message: `Contingency of ${m.contingencyPct}% of hard costs is below the ${rules.minContingencyPct}% minimum.` },
      );
    }
    const months = n(c.timelineMonths);
    if (rules.maxTimelineMonths !== null && months !== null) {
      const sev = months <= rules.maxTimelineMonths ? "pass" : months <= rules.maxTimelineMonths + 6 ? "condition" : "fail";
      push({ code: "TIMELINE", label: "Construction timeline", severity: sev, actual: months, limit: rules.maxTimelineMonths, message: sev === "pass" ? `${months}-month timeline is within the ${rules.maxTimelineMonths}-month maximum.` : `${months}-month timeline exceeds the ${rules.maxTimelineMonths}-month maximum.` });
    }
    const boolRule = (enabled: boolean, ok: boolean | undefined, code: string, label: string, okMsg: string, badMsg: string) => {
      if (!enabled) return;
      push({ code, label, severity: ok ? "pass" : "condition", message: ok ? okMsg : badMsg });
    };
    boolRule(rules.requireLicensedContractor, c.contractorLicensed, "CONTRACTOR_LICENSE", "Licensed contractor", `Licensed general contractor${c.contractorName ? ` (${c.contractorName})` : ""} identified.`, "A licensed and insured general contractor has not been confirmed.");
    boolRule(rules.requirePlans, c.plansComplete, "PLANS", "Plans & specifications", "Architectural plans are complete.", "Final architectural plans are not yet complete.");
    boolRule(rules.requirePermits, c.permitsObtained, "PERMITS", "Building permits", "Building permits have been obtained.", "Building permits have not yet been issued.");
  }

  // Experience
  const exp = n(b.completedProjects);
  if (rules.minCompletedProjects !== null) {
    const ok = exp !== null && exp >= rules.minCompletedProjects;
    push({ code: "EXPERIENCE", label: "Borrower experience", severity: ok ? "pass" : "condition", actual: exp, limit: rules.minCompletedProjects, message: ok ? `${exp} completed project(s) meets the experience requirement.` : `Borrower reports ${exp ?? 0} completed project(s); ${rules.minCompletedProjects} required. A guarantor or experienced partner may satisfy this.` });
  }

  // Decision
  const has = (s: Finding["severity"]) => findings.some((f) => f.severity === s);
  let decision: Decision;
  if (missingFields.length > 0) decision = "ADDITIONAL_INFO_REQUIRED";
  else if (has("fail")) decision = "MANUAL_REVIEW";
  else if (has("condition")) decision = "CONDITIONALLY_ELIGIBLE";
  else decision = "PREQUALIFIED";

  // Conditions
  const conditions: RequiredCondition[] = [];
  const seen = new Set<string>();
  for (const f of findings) {
    if (f.severity !== "condition" && f.severity !== "fail") continue;
    const c = CONDITION_FOR_CODE[f.code];
    if (!c || seen.has(f.code)) continue;
    seen.add(f.code);
    conditions.push({ code: f.code, description: c.text, docCategory: c.doc });
  }
  conditions.push(...standardConditions(loanType, d));

  return {
    decision,
    summary: buildSummary(decision, findings, missingFields),
    metrics: m,
    findings,
    conditions,
    missingFields,
    engineVersion: ENGINE_VERSION,
    evaluatedAt: now.toISOString(),
  };
}

function buildSummary(decision: Decision, findings: Finding[], missing: string[]): string {
  const fails = findings.filter((f) => f.severity === "fail");
  const conds = findings.filter((f) => f.severity === "condition");
  const label = DECISION_LABELS[decision];
  switch (decision) {
    case "ADDITIONAL_INFO_REQUIRED":
      return `${label}: we need ${missing.length} more item(s) to finish the analysis — ${missing.join(", ")}.`;
    case "MANUAL_REVIEW":
      return `${label}: ${fails.map((f) => f.label.toLowerCase()).join(", ")} fall outside automated guidelines. An underwriter will review the file for compensating factors or alternative structuring.`;
    case "CONDITIONALLY_ELIGIBLE":
      return `${label}: the request meets core guidelines subject to ${conds.length} condition(s) — ${conds.map((f) => f.label.toLowerCase()).join(", ")}.`;
    case "PREQUALIFIED":
      return `${label}: the request meets all automated guidelines for this program. Final approval remains subject to verification, appraisal, title and underwriter review.`;
  }
}
