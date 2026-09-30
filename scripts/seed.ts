import bcrypt from "bcryptjs";
import { close, q } from "./db";
import { underwrite } from "../src/lib/underwriting/engine";
import { DEFAULT_GUIDELINES } from "../src/lib/underwriting/guidelines";
import type { ApplicationData, LoanType } from "../src/lib/underwriting/types";

const demo = process.argv.includes("--demo");

async function upsertUser(email: string, password: string, fullName: string, role: string, company?: string) {
  const [row] = await q<{ id: string }>(
    `INSERT INTO users (email, password_hash, full_name, role, company) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role RETURNING id`,
    [email.toLowerCase(), await bcrypt.hash(password, 12), fullName, role, company ?? null],
  );
  return row.id;
}

async function createApplication(applicantId: string, loanType: LoanType, data: ApplicationData) {
  const result = underwrite(loanType, data, DEFAULT_GUIDELINES[loanType]);
  const [app] = await q<{ id: string; ref_number: string }>(
    `INSERT INTO applications (applicant_id, loan_type, status, data, engine_decision, engine_result, engine_run_at, submitted_at)
     VALUES ($1, $2, 'submitted', $3, $4, $5, now(), now()) RETURNING id, ref_number`,
    [applicantId, loanType, JSON.stringify(data), result.decision, JSON.stringify(result)],
  );
  for (const c of result.conditions) {
    await q("INSERT INTO conditions (application_id, source, code, description, doc_category) VALUES ($1, 'engine', $2, $3, $4)", [app.id, c.code, c.description, c.docCategory]);
  }
  await q("INSERT INTO activity (application_id, actor_id, action, detail) VALUES ($1, $2, 'Application submitted', NULL), ($1, NULL, 'Automated underwriting run', $3)", [app.id, applicantId, result.summary]);
  console.log(`  • ${app.ref_number} ${loanType} → ${result.decision}`);
}

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@macnoenterprise.com";
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) throw new Error("Set SEED_ADMIN_PASSWORD in .env.local before seeding.");
  await upsertUser(email, password, "MACNO Administrator", "admin", "MACNO Enterprise LLC");
  console.log(`✔ Admin account: ${email}`);

  if (demo) {
    const [{ n }] = await q<{ n: number }>("SELECT count(*)::int AS n FROM applications");
    if (n > 0) {
      console.log("Applications already exist — skipping demo data.");
    } else {
      await upsertUser("underwriter@demo.macloans.test", "Demo12345!", "Dana Underwriter", "underwriter", "MACNO Enterprise LLC");
      const borrower = await upsertUser("borrower@demo.macloans.test", "Demo12345!", "Jordan Borrower", "applicant", "Jordan Builders LLC");
      console.log("✔ Demo users: underwriter@demo.macloans.test / borrower@demo.macloans.test (password Demo12345!)");
      await createApplication(borrower, "residential", {
        borrower: { firstName: "Jordan", lastName: "Borrower", creditScore: 752, employmentType: "w2", yearsEmployed: 7, annualIncome: 165000, monthlyDebts: 650, liquidAssets: 140000, citizenship: "us_citizen", latePaymentsLast12Months: 0 },
        property: { address: "418 Magnolia Ave", city: "Houston", state: "TX", zip: "77007", propertyType: "sfr", occupancy: "primary", purchasePrice: 485000, estimatedValue: 490000, monthlyTaxes: 850, monthlyInsurance: 160 },
        loan: { purpose: "purchase", requestedAmount: 388000, termMonths: 360, interestRate: 6.625 },
      });
      await createApplication(borrower, "construction", {
        borrower: { firstName: "Jordan", lastName: "Borrower", entityName: "Jordan Builders LLC", creditScore: 728, liquidAssets: 310000, completedProjects: 3, citizenship: "us_citizen" },
        property: { address: "1200 Lakeview Dr", city: "Tampa", state: "FL", zip: "33602", propertyType: "sfr" },
        loan: { purpose: "purchase", requestedAmount: 820000, termMonths: 12, interestRate: 10.5 },
        construction: { landOwned: false, landCost: 190000, hardCosts: 690000, softCosts: 55000, contingency: 25000, interestReserve: 45000, completedValue: 1350000, timelineMonths: 11, contractorName: "Bayline Construction", contractorLicensed: true, plansComplete: true, permitsObtained: false },
      });
      await createApplication(borrower, "commercial", {
        borrower: { firstName: "Jordan", lastName: "Borrower", entityName: "Jordan Holdings LLC", creditScore: 701, liquidAssets: 240000, completedProjects: 2 },
        property: { address: "88 Commerce Blvd", city: "Charlotte", state: "NC", zip: "28202", propertyType: "retail", purchasePrice: 2400000, grossMonthlyRent: 21000, monthlyOperatingExpenses: 8200 },
        loan: { purpose: "purchase", requestedAmount: 1900000, termMonths: 120, amortizationMonths: 300, interestRate: 7.25 },
      });
    }
  }
  await close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
