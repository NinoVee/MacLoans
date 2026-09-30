import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ApplicationForm } from "@/components/application/ApplicationForm";

export const metadata: Metadata = { title: "Instant Prequalification" };

export default function PrequalifyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <p className="eyebrow">Instant Prequalification</p>
        <h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">See where you stand in minutes</h1>
        <p className="mt-2 max-w-2xl text-navy-900/70">
          Answer a few questions and our underwriting engine will calculate your key ratios and a preliminary result. No account
          needed, no credit pull, and nothing is saved.
        </p>
        <div className="mt-8">
          <ApplicationForm mode="quick" />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
