export const LOAN_TYPES = [
  "residential",
  "investment",
  "commercial",
  "construction",
  "land",
  "construction_perm",
] as const;
export type LoanType = (typeof LOAN_TYPES)[number];

export const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  residential: "Residential Real Estate Loan",
  investment: "Investment Property Loan",
  commercial: "Commercial Real Estate Loan",
  construction: "Construction Loan",
  land: "Land Acquisition Loan",
  construction_perm: "Construction-to-Permanent Loan",
};

export const LOAN_TYPE_BLURBS: Record<LoanType, string> = {
  residential: "Purchase or refinance a primary or second home.",
  investment: "1–4 unit rentals qualified on property cash flow (DSCR).",
  commercial: "Multifamily 5+, retail, office, industrial and mixed-use.",
  construction: "Ground-up and major renovation financing with draw schedules.",
  land: "Acquire raw or entitled land for future development.",
  construction_perm: "One close: build it, then roll into long-term financing.",
};

export function isConstruction(t: LoanType) {
  return t === "construction" || t === "construction_perm";
}

export type EmploymentType = "w2" | "self_employed" | "retired" | "other";
export type Citizenship = "us_citizen" | "permanent_resident" | "foreign_national";
export type Occupancy = "primary" | "second_home" | "investment";
export type LoanPurpose = "purchase" | "refinance" | "cash_out";

/** Everything the applicant provides. All numeric fields are optional so drafts can be saved. */
export interface ApplicationData {
  borrower: {
    firstName?: string;
    lastName?: string;
    entityName?: string;
    creditScore?: number;
    employmentType?: EmploymentType;
    yearsEmployed?: number;
    annualIncome?: number;
    otherMonthlyIncome?: number;
    monthlyDebts?: number;
    liquidAssets?: number;
    retirementAssets?: number;
    citizenship?: Citizenship;
    bankruptcyLast4Years?: boolean;
    foreclosureLast7Years?: boolean;
    latePaymentsLast12Months?: number;
    completedProjects?: number;
  };
  property: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    propertyType?: string;
    occupancy?: Occupancy;
    units?: number;
    purchasePrice?: number;
    estimatedValue?: number;
    existingLiens?: number;
    monthlyTaxes?: number;
    monthlyInsurance?: number;
    monthlyHoa?: number;
    grossMonthlyRent?: number;
    monthlyOperatingExpenses?: number;
  };
  loan: {
    purpose?: LoanPurpose;
    requestedAmount?: number;
    termMonths?: number;
    amortizationMonths?: number;
    interestRate?: number;
    interestOnly?: boolean;
  };
  construction?: {
    landOwned?: boolean;
    landCost?: number;
    landValue?: number;
    hardCosts?: number;
    softCosts?: number;
    contingency?: number;
    interestReserve?: number;
    completedValue?: number;
    timelineMonths?: number;
    contractorName?: string;
    contractorLicensed?: boolean;
    fixedPriceContract?: boolean;
    plansComplete?: boolean;
    permitsObtained?: boolean;
  };
}

/** Lender guidelines for a loan product. `null` disables a rule. */
export interface GuidelineRules {
  label: string;
  minCreditScore: number | null;
  maxLtv: number | null; // %
  maxLtc: number | null; // %
  maxLtArv: number | null; // % of as-completed value
  maxFrontDti: number | null; // %
  maxBackDti: number | null; // %
  minDscr: number | null;
  minReserveMonths: number | null;
  minLoanAmount: number | null;
  maxLoanAmount: number | null;
  minContingencyPct: number | null; // % of hard costs
  maxTimelineMonths: number | null;
  minCompletedProjects: number | null;
  minYearsEmployed: number | null;
  maxLatePayments12Months: number | null;
  requireLicensedContractor: boolean;
  requirePermits: boolean;
  requirePlans: boolean;
  allowForeignNational: boolean;
  /** How far outside a limit an application can be and still be "Conditionally Eligible". */
  tolerance: {
    creditScorePoints: number;
    ratioPct: number; // LTV/LTC/DTI percentage points
    dscr: number;
    reserveMonths: number;
  };
  /** Assumed closing costs as a % of the loan amount, used for cash-to-close. */
  closingCostPct: number;
}

export const DECISIONS = [
  "PREQUALIFIED",
  "CONDITIONALLY_ELIGIBLE",
  "ADDITIONAL_INFO_REQUIRED",
  "MANUAL_REVIEW",
] as const;
export type Decision = (typeof DECISIONS)[number];

export const DECISION_LABELS: Record<Decision, string> = {
  PREQUALIFIED: "Prequalified",
  CONDITIONALLY_ELIGIBLE: "Conditionally Eligible",
  ADDITIONAL_INFO_REQUIRED: "Additional Information Required",
  MANUAL_REVIEW: "Manual Underwriting Review Required",
};

export type FindingSeverity = "pass" | "condition" | "fail" | "missing";

export interface Finding {
  code: string;
  label: string;
  severity: FindingSeverity;
  message: string;
  actual?: number | string | null;
  limit?: number | string | null;
}

export interface Metrics {
  loanAmount: number | null;
  propertyValue: number | null;
  ltv: number | null;
  ltc: number | null;
  ltArv: number | null;
  totalProjectCost: number | null;
  contingencyPct: number | null;
  monthlyPrincipalInterest: number | null;
  monthlyHousingPayment: number | null; // PITIA
  grossMonthlyIncome: number | null;
  frontDti: number | null;
  backDti: number | null;
  netOperatingIncomeAnnual: number | null;
  dscr: number | null;
  downPayment: number | null;
  estimatedClosingCosts: number | null;
  requiredCashContribution: number | null;
  reservesAfterClose: number | null;
  reserveMonths: number | null;
  availableEquity: number | null;
}

export interface RequiredCondition {
  code: string;
  description: string;
  docCategory: string | null;
}

export interface UnderwritingResult {
  decision: Decision;
  summary: string;
  metrics: Metrics;
  findings: Finding[];
  conditions: RequiredCondition[];
  missingFields: string[];
  engineVersion: string;
  evaluatedAt: string;
}
