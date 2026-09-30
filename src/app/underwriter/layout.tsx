import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/auth";

export default async function UnderwriterLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["underwriter", "admin"]);
  return <AppShell user={user}>{children}</AppShell>;
}
