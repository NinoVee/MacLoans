import { isConstruction, type ApplicationData, type LoanType } from "@/lib/underwriting/types";

export type FieldType = "money" | "number" | "percent" | "text" | "select" | "bool";
type Section = keyof ApplicationData;

export interface FieldDef {
  section: Section;
  key: string;
  label: string;
  type: FieldType;
  hint?: string;
  options?: [value: string, label: string][];
  /** Shown in the short, anonymous prequalification flow. */
  quick?: boolean;
  show?: (t: LoanType, d: ApplicationData) => boolean;
  wide?: boolean;
}

export interface StepDef {
  id: string;
  title: string;
  description: string;
  fields: FieldDef[];
  show?: (t: LoanType) => boolean;
}

const personal = (t: LoanType) => t === "residential" || t === "construction_perm";
const incomeProperty = (t: LoanType) => t === "investment" || t === "commercial";
const notBuild = (t: LoanType) => !isConstruction(t);
const purchase = (_: LoanType, d: ApplicationData) => (d.loan?.purpose ?? "purchase") === "purchase";

export const US_STATES = "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ");

export const STEPS: StepDef[] = [
  {
    id: "borrower",
    title: "Borrower Profile",
    description: "Tell us about the borrower, credit history, income and available assets.",
    fields: [
      { section: "borrower", key: "firstName", label: "First name", type: "text" },
      { section: "borrower", key: "lastName", label: "Last name", type: "text" },
      { section: "borrower", key: "entityName", label: "Borrowing entity (LLC / Corp)", type: "text", hint: "Optional", show: (t) => !personal(t) },
      { section: "borrower", key: "citizenship", label: "Residency", type: "select", options: [["us_citizen", "U.S. Citizen"], ["permanent_resident", "Permanent Resident"], ["foreign_national", "Foreign National"]] },
      { section: "borrower", key: "creditScore", label: "Estimated credit score", type: "number", hint: "Middle score of the primary borrower", quick: true },
      { section: "borrower", key: "employmentType", label: "Employment type", type: "select", options: [["w2", "W-2 Employee"], ["self_employed", "Self-Employed / 1099 / K-1"], ["retired", "Retired"], ["other", "Other"]], show: personal },
      { section: "borrower", key: "yearsEmployed", label: "Years in current line of work", type: "number", show: personal },
      { section: "borrower", key: "annualIncome", label: "Gross annual income", type: "money", quick: true, show: personal, hint: "Before taxes, all borrowers" },
      { section: "borrower", key: "otherMonthlyIncome", label: "Other monthly income", type: "money", show: personal, hint: "Social Security, pension, alimony, etc." },
      { section: "borrower", key: "monthlyDebts", label: "Monthly debt payments", type: "money", quick: true, show: personal, hint: "Car, student loan, card minimums, other mortgages" },
      { section: "borrower", key: "liquidAssets", label: "Liquid assets", type: "money", quick: true, hint: "Checking, savings, brokerage" },
      { section: "borrower", key: "retirementAssets", label: "Retirement assets", type: "money", hint: "401(k), IRA — counted at 60%" },
      { section: "borrower", key: "completedProjects", label: "Completed projects / properties owned", type: "number", show: (t) => !personal(t) || isConstruction(t), hint: "Real estate investment or construction track record" },
      { section: "borrower", key: "latePaymentsLast12Months", label: "Late payments (last 12 months)", type: "number" },
      { section: "borrower", key: "bankruptcyLast4Years", label: "Bankruptcy in the last 4 years", type: "bool" },
      { section: "borrower", key: "foreclosureLast7Years", label: "Foreclosure / short sale in the last 7 years", type: "bool" },
    ],
  },
  {
    id: "property",
    title: "Property",
    description: "The subject property and its carrying costs.",
    fields: [
      { section: "property", key: "address", label: "Street address", type: "text", wide: true },
      { section: "property", key: "city", label: "City", type: "text" },
      { section: "property", key: "state", label: "State", type: "select", quick: true, options: US_STATES.map((s) => [s, s]) },
      { section: "property", key: "zip", label: "ZIP", type: "text" },
      {
        section: "property", key: "propertyType", label: "Property type", type: "select",
        options: [["sfr", "Single-Family"], ["condo", "Condo / Townhome"], ["2-4", "2–4 Units"], ["multifamily", "Multifamily 5+"], ["retail", "Retail"], ["office", "Office"], ["industrial", "Industrial"], ["mixed_use", "Mixed-Use"], ["land", "Land"]],
      },
      { section: "property", key: "occupancy", label: "Occupancy", type: "select", quick: true, options: [["primary", "Primary Residence"], ["second_home", "Second Home"]], show: (t) => t === "residential" },
      { section: "property", key: "purchasePrice", label: "Purchase price", type: "money", quick: true, show: (t, d) => notBuild(t) && purchase(t, d) },
      { section: "property", key: "estimatedValue", label: "Estimated current value", type: "money", quick: true, show: notBuild, hint: "Appraised or estimated market value" },
      { section: "property", key: "existingLiens", label: "Existing liens / payoff", type: "money", show: (t, d) => notBuild(t) && !purchase(t, d) },
      { section: "property", key: "monthlyTaxes", label: "Monthly property taxes", type: "money", quick: true, show: (t) => t !== "commercial" && t !== "land" && t !== "construction" },
      { section: "property", key: "monthlyInsurance", label: "Monthly insurance", type: "money", quick: true, show: (t) => t !== "commercial" && t !== "land" && t !== "construction" },
      { section: "property", key: "monthlyHoa", label: "Monthly HOA dues", type: "money", show: (t) => t === "residential" || t === "investment" || t === "construction_perm" },
      { section: "property", key: "grossMonthlyRent", label: "Gross monthly rent", type: "money", quick: true, show: incomeProperty, hint: "Current leases or market rent" },
      { section: "property", key: "monthlyOperatingExpenses", label: "Monthly operating expenses", type: "money", quick: true, show: (t) => t === "commercial", hint: "Taxes, insurance, management, maintenance, utilities" },
    ],
  },
  {
    id: "construction",
    title: "Construction Project",
    description: "Land, budget, timeline and team. We compare total project cost against the projected completed value.",
    show: isConstruction,
    fields: [
      { section: "construction", key: "landOwned", label: "Borrower already owns the land", type: "bool" },
      { section: "construction", key: "landCost", label: "Land purchase price", type: "money", quick: true, show: (_, d) => !d.construction?.landOwned },
      { section: "construction", key: "landValue", label: "Current land value", type: "money", quick: true, show: (_, d) => !!d.construction?.landOwned },
      { section: "construction", key: "hardCosts", label: "Hard costs", type: "money", quick: true, hint: "Labor & materials (vertical + site work)" },
      { section: "construction", key: "softCosts", label: "Soft costs", type: "money", quick: true, hint: "Architecture, engineering, permits, fees" },
      { section: "construction", key: "contingency", label: "Contingency reserve", type: "money", quick: true },
      { section: "construction", key: "interestReserve", label: "Interest reserve", type: "money" },
      { section: "construction", key: "completedValue", label: "Projected completed value", type: "money", quick: true, hint: "As-completed / after-repair value" },
      { section: "construction", key: "timelineMonths", label: "Construction timeline (months)", type: "number", quick: true },
      { section: "construction", key: "contractorName", label: "General contractor", type: "text" },
      { section: "construction", key: "contractorLicensed", label: "Contractor is licensed & insured", type: "bool" },
      { section: "construction", key: "fixedPriceContract", label: "Fixed-price construction contract", type: "bool" },
      { section: "construction", key: "plansComplete", label: "Architectural plans complete", type: "bool" },
      { section: "construction", key: "permitsObtained", label: "Building permits issued", type: "bool" },
    ],
  },
  {
    id: "loan",
    title: "Loan Request",
    description: "The financing you are requesting.",
    fields: [
      { section: "loan", key: "requestedAmount", label: "Requested loan amount", type: "money", quick: true },
      { section: "loan", key: "interestRate", label: "Estimated interest rate", type: "percent", quick: true, hint: "Use a current market rate if unsure" },
      { section: "loan", key: "termMonths", label: "Term (months)", type: "number", quick: true, hint: "e.g. 360 = 30 years; 12 for construction" },
      { section: "loan", key: "amortizationMonths", label: "Amortization (months)", type: "number", show: (t) => t !== "construction", hint: "Leave blank to match term" },
      { section: "loan", key: "interestOnly", label: "Interest-only payments", type: "bool", show: (t) => t !== "construction" && t !== "construction_perm" },
    ],
  },
];

export function visibleFields(step: StepDef, t: LoanType, d: ApplicationData, quick: boolean) {
  return step.fields.filter((f) => (!f.show || f.show(t, d)) && (!quick || f.quick));
}
