import { describe, expect, it } from "vitest";
import { monthlyPayment, underwrite } from "./engine";
import { DEFAULT_GUIDELINES, resolveGuidelines } from "./guidelines";
import type { ApplicationData } from "./types";

const strongResidential = (): ApplicationData => ({
  borrower: {
    creditScore: 760,
    employmentType: "w2",
    yearsEmployed: 6,
    annualIncome: 180_000,
    monthlyDebts: 600,
    liquidAssets: 150_000,
    citizenship: "us_citizen",
    latePaymentsLast12Months: 0,
  },
  property: { state: "TX", occupancy: "primary", purchasePrice: 500_000, estimatedValue: 510_000, monthlyTaxes: 800, monthlyInsurance: 150 },
  loan: { purpose: "purchase", requestedAmount: 400_000, termMonths: 360, interestRate: 6.5 },
});

const construction = (): ApplicationData => ({
  borrower: { creditScore: 740, liquidAssets: 400_000, completedProjects: 4, citizenship: "us_citizen" },
  property: { state: "FL" },
  loan: { purpose: "purchase", requestedAmount: 850_000, termMonths: 12, interestRate: 10 },
  construction: {
    landOwned: false,
    landCost: 200_000,
    hardCosts: 700_000,
    softCosts: 60_000,
    contingency: 50_000,
    interestReserve: 40_000,
    completedValue: 1_400_000,
    timelineMonths: 10,
    contractorLicensed: true,
    plansComplete: true,
    permitsObtained: true,
  },
});

describe("monthlyPayment", () => {
  it("matches a standard 30-year amortization", () => {
    expect(monthlyPayment(400_000, 6.5, 360)).toBeCloseTo(2528.27, 2);
  });
  it("computes interest-only payments", () => {
    expect(monthlyPayment(100_000, 12, 0, true)).toBeCloseTo(1000, 6);
  });
  it("handles a zero interest rate", () => {
    expect(monthlyPayment(12_000, 0, 12)).toBe(1000);
  });
});

describe("underwrite — residential", () => {
  it("prequalifies a strong file and computes LTV/DTI", () => {
    const r = underwrite("residential", strongResidential(), DEFAULT_GUIDELINES.residential);
    expect(r.decision).toBe("PREQUALIFIED");
    expect(r.metrics.ltv).toBe(80);
    expect(r.metrics.monthlyHousingPayment).toBeCloseTo(3478.27, 1);
    expect(r.metrics.backDti).toBeCloseTo(((3478.27 + 600) / 15_000) * 100, 1);
    expect(r.metrics.downPayment).toBe(100_000);
    expect(r.conditions.every((c) => c.code.startsWith("STD_"))).toBe(true);
  });

  it("asks for more information when required fields are missing", () => {
    const d = strongResidential();
    delete d.borrower.annualIncome;
    delete d.borrower.creditScore;
    const r = underwrite("residential", d, DEFAULT_GUIDELINES.residential);
    expect(r.decision).toBe("ADDITIONAL_INFO_REQUIRED");
    expect(r.missingFields).toEqual(expect.arrayContaining(["Annual income", "Credit score"]));
  });

  it("is conditionally eligible when slightly outside a limit", () => {
    const d = strongResidential();
    d.borrower.creditScore = 610; // 10 points under 620, within 20-point tolerance
    const r = underwrite("residential", d, DEFAULT_GUIDELINES.residential);
    expect(r.decision).toBe("CONDITIONALLY_ELIGIBLE");
    expect(r.conditions.some((c) => c.code === "CREDIT_SCORE")).toBe(true);
  });

  it("routes to manual review when well outside a limit", () => {
    const d = strongResidential();
    d.borrower.annualIncome = 60_000;
    const r = underwrite("residential", d, DEFAULT_GUIDELINES.residential);
    expect(r.decision).toBe("MANUAL_REVIEW");
    expect(r.findings.find((f) => f.code === "BACK_DTI")?.severity).toBe("fail");
  });

  it("routes a recent bankruptcy to manual review", () => {
    const d = strongResidential();
    d.borrower.bankruptcyLast4Years = true;
    expect(underwrite("residential", d, DEFAULT_GUIDELINES.residential).decision).toBe("MANUAL_REVIEW");
  });

  it("flags insufficient funds to close", () => {
    const d = strongResidential();
    d.borrower.liquidAssets = 50_000;
    const r = underwrite("residential", d, DEFAULT_GUIDELINES.residential);
    expect(r.findings.find((f) => f.code === "FUNDS_TO_CLOSE")?.severity).toBe("fail");
  });
});

describe("underwrite — income property", () => {
  it("computes DSCR for an investment property", () => {
    const d: ApplicationData = {
      borrower: { creditScore: 720, liquidAssets: 120_000 },
      property: { state: "GA", purchasePrice: 300_000, monthlyTaxes: 300, monthlyInsurance: 100, grossMonthlyRent: 2_600 },
      loan: { purpose: "purchase", requestedAmount: 225_000, termMonths: 360, interestRate: 7.5 },
    };
    const r = underwrite("investment", d, DEFAULT_GUIDELINES.investment);
    expect(r.metrics.ltv).toBe(75);
    expect(r.metrics.dscr).toBeGreaterThan(1);
    expect(r.decision).toBe("PREQUALIFIED");
  });

  it("uses NOI for commercial DSCR", () => {
    const d: ApplicationData = {
      borrower: { creditScore: 720, liquidAssets: 600_000, completedProjects: 3 },
      property: { state: "NC", purchasePrice: 2_000_000, grossMonthlyRent: 25_000, monthlyOperatingExpenses: 9_000 },
      loan: { purpose: "purchase", requestedAmount: 1_400_000, termMonths: 120, amortizationMonths: 300, interestRate: 7 },
    };
    const r = underwrite("commercial", d, DEFAULT_GUIDELINES.commercial);
    expect(r.metrics.netOperatingIncomeAnnual).toBe(192_000);
    expect(r.metrics.dscr).toBeCloseTo(192_000 / (r.metrics.monthlyPrincipalInterest! * 12), 2);
  });
});

describe("underwrite — construction", () => {
  it("computes LTC, loan-to-completed-value and cash required", () => {
    const r = underwrite("construction", construction(), DEFAULT_GUIDELINES.construction);
    expect(r.metrics.totalProjectCost).toBe(1_050_000);
    expect(r.metrics.ltc).toBeCloseTo(80.95, 2);
    expect(r.metrics.ltArv).toBeCloseTo(60.71, 2);
    expect(r.metrics.downPayment).toBe(200_000);
    expect(r.decision).toBe("PREQUALIFIED");
  });

  it("credits owned land as equity", () => {
    const d = construction();
    d.construction!.landOwned = true;
    d.construction!.landValue = 250_000;
    const r = underwrite("construction", d, DEFAULT_GUIDELINES.construction);
    expect(r.metrics.totalProjectCost).toBe(1_100_000);
    expect(r.metrics.downPayment).toBe(0);
  });

  it("adds conditions for missing permits and thin contingency", () => {
    const d = construction();
    d.construction!.permitsObtained = false;
    d.construction!.contingency = 10_000;
    const r = underwrite("construction", d, DEFAULT_GUIDELINES.construction);
    expect(r.decision).toBe("CONDITIONALLY_ELIGIBLE");
    expect(r.conditions.map((c) => c.code)).toEqual(expect.arrayContaining(["PERMITS", "CONTINGENCY"]));
  });

  it("sends infeasible projects to manual review", () => {
    const d = construction();
    d.construction!.completedValue = 900_000;
    expect(underwrite("construction", d, DEFAULT_GUIDELINES.construction).decision).toBe("MANUAL_REVIEW");
  });
});

describe("resolveGuidelines", () => {
  it("overlays stored rules on the defaults", () => {
    const g = resolveGuidelines("land", { maxLtv: 60, tolerance: { dscr: 0.2 } as never });
    expect(g.maxLtv).toBe(60);
    expect(g.minCreditScore).toBe(DEFAULT_GUIDELINES.land.minCreditScore);
    expect(g.tolerance.dscr).toBe(0.2);
    expect(g.tolerance.ratioPct).toBe(DEFAULT_GUIDELINES.land.tolerance.ratioPct);
  });
});
