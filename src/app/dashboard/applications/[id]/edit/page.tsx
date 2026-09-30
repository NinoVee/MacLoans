import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAccessibleApplication } from "@/lib/applications";
import { EDITABLE_STATUSES } from "@/lib/status";
import { ApplicationForm } from "@/components/application/ApplicationForm";

export default async function EditApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(["applicant"]);
  const app = await getAccessibleApplication(user, id);
  if (!app || app.applicant_id !== user.id) notFound();
  if (!EDITABLE_STATUSES.includes(app.status)) redirect(`/dashboard/applications/${id}`);
  return (
    <div>
      <p className="eyebrow">{app.ref_number}</p>
      <h1 className="mt-1 mb-6 font-serif text-3xl font-bold">{app.status === "draft" ? "Continue your application" : "Update your application"}</h1>
      <ApplicationForm mode="full" applicationId={app.id} initialLoanType={app.loan_type} initialData={app.data} />
    </div>
  );
}
