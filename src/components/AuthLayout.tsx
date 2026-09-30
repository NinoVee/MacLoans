import { Logo } from "./Logo";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-navy-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(201,162,39,0.25),transparent_60%)]" />
        <div className="relative"><Logo dark /></div>
        <div className="relative">
          <p className="font-serif text-4xl leading-tight font-bold">
            Mortgage solutions &amp; construction support.<br />
            <span className="text-gold-400 italic">All in one place.</span>
          </p>
          <p className="mt-4 max-w-md text-white/70">Secure applications, instant preliminary results, and experienced underwriters behind every decision.</p>
        </div>
        <p className="relative text-xs tracking-[0.25em] text-white/50">CONFIDENTIAL · PROFESSIONAL · RELIABLE</p>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h1 className="font-serif text-3xl font-bold">{title}</h1>
          <p className="mt-1 mb-8 text-sm text-navy-900/60">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
