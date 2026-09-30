import type { GuidelineRules, LoanType } from "./types";

const baseTolerance = { creditScorePoints: 20, ratioPct: 5, dscr: 0.1, reserveMonths: 2 };

const base: Omit<GuidelineRules, "label"> = {
  minCreditScore: 660,
  maxLtv: 80,
  maxLtc: null,
  maxLtArv: null,
  maxFrontDti: null,
  maxBackDti: null,
  minDscr: null,
  minReserveMonths: 6,
  minLoanAmount: 75_000,
  maxLoanAmount: 3_000_000,
  minContingencyPct: null,
  maxTimelineMonths: null,
  minCompletedProjects: null,
  minYearsEmployed: null,
  maxLatePayments12Months: 1,
  requireLicensedContractor: false,
  requirePermits: false,
  requirePlans: false,
  allowForeignNational: false,
  tolerance: baseTolerance,
  closingCostPct: 3,
};

/**
 * Starting guidelines for each product. Lenders edit these from the Admin → Guidelines screen;
 * the edited copy is stored in the `lender_guidelines` table and takes precedence.
 */
export const DEFAULT_GUIDELINES: Record<LoanType, GuidelineRules> = {
  residential: {
    ...base,
    label: "Residential Real Estate Loan",
    minCreditScore: 620,
    maxLtv: 95,
    maxFrontDti: 36,
    maxBackDti: 45,
    minReserveMonths: 2,
    minLoanAmount: 50_000,
    maxLoanAmount: 3_000_000,
    minYearsEmployed: 2,
  },
  investment: {
    ...base,
    label: "Investment Property Loan (DSCR)",
    minCreditScore: 660,
    maxLtv: 80,
    minDscr: 1.0,
    minReserveMonths: 6,
    maxLoanAmount: 3_000_000,
    allowForeignNational: true,
  },
  commercial: {
    ...base,
    label: "Commercial Real Estate Loan",
    minCreditScore: 680,
    maxLtv: 75,
    minDscr: 1.25,
    minReserveMonths: 6,
    minLoanAmount: 250_000,
    maxLoanAmount: 25_000_000,
    minCompletedProjects: 1,
  },
  construction: {
    ...base,
    label: "Construction Loan",
    minCreditScore: 680,
    maxLtv: null,
    maxLtc: 85,
    maxLtArv: 75,
    minReserveMonths: 6,
    minLoanAmount: 100_000,
    maxLoanAmount: 10_000_000,
    minContingencyPct: 5,
    maxTimelineMonths: 18,
    minCompletedProjects: 1,
    requireLicensedContractor: true,
    requirePermits: true,
    requirePlans: true,
  },
  land: {
    ...base,
    label: "Land Acquisition Loan",
    minCreditScore: 700,
    maxLtv: 50,
    minReserveMonths: 12,
    minLoanAmount: 50_000,
    maxLoanAmount: 5_000_000,
  },
  construction_perm: {
    ...base,
    label: "Construction-to-Permanent Loan",
    minCreditScore: 680,
    maxLtv: null,
    maxLtc: 85,
    maxLtArv: 80,
    maxBackDti: 45,
    minReserveMonths: 6,
    minLoanAmount: 100_000,
    maxLoanAmount: 3_000_000,
    minContingencyPct: 5,
    maxTimelineMonths: 12,
    minYearsEmployed: 2,
    requireLicensedContractor: true,
    requirePermits: true,
    requirePlans: true,
  },
};

/** Merge stored (possibly partial / older) rules on top of the defaults. */
export function resolveGuidelines(loanType: LoanType, stored?: Partial<GuidelineRules> | null): GuidelineRules {
  const d = DEFAULT_GUIDELINES[loanType];
  if (!stored) return d;
  return { ...d, ...stored, tolerance: { ...d.tolerance, ...(stored.tolerance ?? {}) } };
}
