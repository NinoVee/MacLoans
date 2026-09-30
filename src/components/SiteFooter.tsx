import Link from "next/link";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="bg-navy-950 text-white/70">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo dark />
          <p className="mt-4 max-w-md text-sm">
            Mortgage solutions &amp; construction support — all in one place. Automated underwriting, expert review, and due
            diligence for borrowers, investors, builders, developers and lenders.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gold-400">Platform</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/prequalify" className="hover:text-white">Instant Prequalification</Link></li>
            <li><Link href="/register" className="hover:text-white">Start an Application</Link></li>
            <li><Link href="/login" className="hover:text-white">Borrower Login</Link></li>
            <li><Link href="/login" className="hover:text-white">Lender &amp; Underwriter Login</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gold-400">Services</h4>
          <ul className="space-y-2 text-sm">
            <li>Mortgage File Review</li>
            <li>Construction File Review</li>
            <li>Auditing &amp; Field Inspections</li>
            <li>Background Checks &amp; Surveillance</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-5 text-center text-xs text-white/50 sm:px-6">
          <p className="mb-2 font-semibold tracking-[0.25em] text-white/70">MACNO ENTERPRISE LLC · CONFIDENTIAL · PROFESSIONAL · RELIABLE</p>
          <p>
            Preliminary results are not a commitment to lend. Final approval is subject to lender requirements, verification,
            appraisal, title review, documentation and underwriter review. MACNO Enterprise LLC provides information, review and
            support services only — no legal advice is provided.
          </p>
          <p className="mt-2">© {new Date().getFullYear()} MACNO Enterprise LLC. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
