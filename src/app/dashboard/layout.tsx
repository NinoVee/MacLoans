import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["applicant"]);
  return <AppShell user={user}>{children}</AppShell>;
}
