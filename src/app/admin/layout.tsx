import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["admin"]);
  return <AppShell user={user}>{children}</AppShell>;
}
