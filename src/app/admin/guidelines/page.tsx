import Link from "next/link";
import type { Metadata } from "next";
import { getAllGuidelines } from "@/lib/applications";
import { LOAN_TYPES, LOAN_TYPE_LABELS, type LoanType } from "@/lib/underwriting/types";
import { GuidelinesEditor } from "@/components/GuidelinesEditor";
import { resetGuidelinesAction } from "@/app/actions/admin";

export const metadata: Metadata = { title: "Lender Guidelines" };

export default async function GuidelinesPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const loanType: LoanType = (LOAN_TYPES as readonly string[]).includes(type ?? "") ? (type as LoanType) : "residential";
  const all = await getAllGuidelines();

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Administration</p>
        <h1 className="mt-1 font-serif text-3xl font-bold">Lender Guidelines</h1>
        <p className="mt-1 max-w-3xl text-sm text-navy-900/60">
          Configure the rules the automated underwriting engine applies to each loan program. Leave a field blank to disable that rule.
          Changes apply to new submissions and to files when an underwriter re-runs the engine.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {LOAN_TYPES.map((t) => (
          <Link key={t} href={`/admin/guidelines?type=${t}`} className={t === loanType ? "btn-navy" : "btn-outline"}>
            {LOAN_TYPE_LABELS[t]}
          </Link>
        ))}
      </div>
      <div className="card p-6">
        <GuidelinesEditor key={loanType} loanType={loanType} rules={all[loanType]} />
        <form action={resetGuidelinesAction.bind(null, loanType)} className="mt-4 border-t border-navy-900/10 pt-4">
          <button className="btn-ghost text-xs text-rose-700">Reset {LOAN_TYPE_LABELS[loanType]} to platform defaults</button>
        </form>
      </div>
    </div>
  );
}
