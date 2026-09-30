import Link from "next/link";
import { Logo } from "./Logo";
import { getSessionUser, homeFor } from "@/lib/auth";

export async function SiteHeader() {
  let user = null;
  try {
    user = await getSessionUser();
  } catch {
    // Public pages must render even if the database is unreachable.
  }
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Logo dark />
        <nav className="hidden items-center gap-6 text-sm font-medium text-white/80 md:flex">
          <Link href="/#platform" className="hover:text-gold-400">Platform</Link>
          <Link href="/#programs" className="hover:text-gold-400">Loan Programs</Link>
          <Link href="/#services" className="hover:text-gold-400">Services</Link>
          <Link href="/#how" className="hover:text-gold-400">How It Works</Link>
          <Link href="/prequalify" className="hover:text-gold-400">Instant Prequal</Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Link href={homeFor(user.role)} className="btn-gold">My Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="btn text-white hover:text-gold-400">Sign in</Link>
              <Link href="/register" className="btn-gold">Apply Now</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
