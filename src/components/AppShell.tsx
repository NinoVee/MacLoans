import Link from "next/link";
import { Logo } from "./Logo";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/auth";

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const links =
    user.role === "applicant"
      ? [["/dashboard", "My Applications"], ["/dashboard/applications/new", "New Application"], ["/prequalify", "Quick Prequal"]]
      : [
          ["/underwriter", "Pipeline"],
          ...(user.role === "admin" ? [["/admin/guidelines", "Guidelines"], ["/admin/users", "Users"]] : []),
        ];
  return (
    <div className="min-h-screen">
      <header className="bg-navy-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-8">
            <Logo dark href={user.role === "applicant" ? "/dashboard" : "/underwriter"} />
            <nav className="flex flex-wrap gap-1 text-sm">
              {links.map(([href, label]) => (
                <Link key={href} href={href} className="rounded-md px-3 py-1.5 text-white/80 hover:bg-white/10 hover:text-white">
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="text-right leading-tight">
              <div className="font-semibold">{user.fullName}</div>
              <div className="text-[11px] tracking-wider text-gold-400 uppercase">{user.role === "applicant" ? "Borrower" : user.role}</div>
            </div>
            <form action={logoutAction}>
              <button className="btn border border-white/20 px-3 py-1.5 text-white hover:bg-white/10">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
      <footer className="border-t border-navy-900/10 py-6 text-center text-[11px] text-navy-900/50">
        MACNO Enterprise LLC · Preliminary results are not a commitment to lend · No legal advice is provided.
      </footer>
    </div>
  );
}
