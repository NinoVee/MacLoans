import Link from "next/link";

export function LogoMark({ className = "h-8 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 44" className={className} aria-hidden>
      <path d="M4 26 L32 4 L60 26" fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
      <path d="M14 22 L32 8 L54 26" fill="none" className="text-gold-500" stroke="currentColor" strokeWidth="2.5" />
      <rect x="27" y="16" width="4" height="4" fill="currentColor" />
      <rect x="33" y="16" width="4" height="4" fill="currentColor" />
      <rect x="27" y="22" width="4" height="4" fill="currentColor" />
      <rect x="33" y="22" width="4" height="4" fill="currentColor" />
    </svg>
  );
}

export function Logo({ dark = false, href = "/" }: { dark?: boolean; href?: string }) {
  return (
    <Link href={href} className={`flex items-center gap-2 ${dark ? "text-white" : "text-navy-900"}`}>
      <LogoMark />
      <span className="leading-none">
        <span className="block font-serif text-xl font-bold tracking-wide">MACNO</span>
        <span className={`block text-[9px] font-semibold tracking-[0.28em] ${dark ? "text-gold-400" : "text-navy-700"}`}>ENTERPRISE LLC</span>
      </span>
    </Link>
  );
}
