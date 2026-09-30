import type { ApplicationData } from "./types";

type Kind = "num" | "str" | "bool";
const SCHEMA: Record<keyof ApplicationData, Record<string, Kind>> = {
  borrower: {
    firstName: "str", lastName: "str", entityName: "str", creditScore: "num", employmentType: "str", yearsEmployed: "num",
    annualIncome: "num", otherMonthlyIncome: "num", monthlyDebts: "num", liquidAssets: "num", retirementAssets: "num",
    citizenship: "str", bankruptcyLast4Years: "bool", foreclosureLast7Years: "bool", latePaymentsLast12Months: "num",
    completedProjects: "num",
  },
  property: {
    address: "str", city: "str", state: "str", zip: "str", propertyType: "str", occupancy: "str", units: "num",
    purchasePrice: "num", estimatedValue: "num", existingLiens: "num", monthlyTaxes: "num", monthlyInsurance: "num",
    monthlyHoa: "num", grossMonthlyRent: "num", monthlyOperatingExpenses: "num",
  },
  loan: { purpose: "str", requestedAmount: "num", termMonths: "num", amortizationMonths: "num", interestRate: "num", interestOnly: "bool" },
  construction: {
    landOwned: "bool", landCost: "num", landValue: "num", hardCosts: "num", softCosts: "num", contingency: "num",
    interestReserve: "num", completedValue: "num", timelineMonths: "num", contractorName: "str", contractorLicensed: "bool",
    fixedPriceContract: "bool", plansComplete: "bool", permitsObtained: "bool",
  },
};

function coerce(kind: Kind, v: unknown): unknown {
  if (v === undefined || v === null || v === "") return undefined;
  if (kind === "num") {
    const x = typeof v === "number" ? v : Number(String(v).replace(/[$,%\s]/g, ""));
    return Number.isFinite(x) && x >= 0 && x < 1e12 ? x : undefined;
  }
  if (kind === "bool") return v === true || v === "true" || v === "on" || v === "yes";
  return String(v).slice(0, 200).trim() || undefined;
}

/** Whitelist and type-coerce untrusted application input. */
export function sanitizeApplicationData(input: unknown): ApplicationData {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, Record<string, unknown> | undefined>;
  const out: Record<string, Record<string, unknown>> = {};
  for (const [section, fields] of Object.entries(SCHEMA)) {
    out[section] = {};
    for (const [key, kind] of Object.entries(fields)) {
      const v = coerce(kind, src[section]?.[key]);
      if (v !== undefined) out[section][key] = v;
    }
  }
  return out as unknown as ApplicationData;
}
