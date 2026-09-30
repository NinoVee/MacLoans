import type { Metadata } from "next";
import { ApplicationForm } from "@/components/application/ApplicationForm";

export const metadata: Metadata = { title: "New Application" };

export default function NewApplicationPage() {
  return (
    <div>
      <p className="eyebrow">New Application</p>
      <h1 className="mt-1 mb-6 font-serif text-3xl font-bold">Loan application</h1>
      <ApplicationForm mode="full" />
    </div>
  );
}
