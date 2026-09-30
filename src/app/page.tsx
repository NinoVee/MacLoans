import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LOAN_TYPES, LOAN_TYPE_BLURBS, LOAN_TYPE_LABELS } from "@/lib/underwriting/types";
import { DEFAULT_GUIDELINES } from "@/lib/underwriting/guidelines";

const Check = () => <span className="mt-0.5 text-gold-500">✔</span>;

const RESULTS = [
  { label: "Prequalified", cls: "bg-emerald-400", text: "Meets every automated guideline for the program." },
  { label: "Conditionally Eligible", cls: "bg-amber-400", text: "Qualifies once specific conditions are satisfied." },
  { label: "Additional Information Required", cls: "bg-sky-400", text: "We tell you exactly what's missing." },
  { label: "Manual Underwriting Review", cls: "bg-rose-400", text: "An experienced underwriter reviews compensating factors." },
];

const METRICS = ["Loan-to-Value (LTV)", "Loan-to-Cost (LTC)", "Debt-to-Income (DTI)", "Debt-Service Coverage (DSCR)", "Required Cash Contribution", "Estimated Monthly Payment", "Post-Closing Reserves", "Available Equity"];

const SERVICES = [
  {
    title: "Mortgage Services",
    tag: "Accuracy · Compliance · Confidence",
    items: [
      ["Underwriting File Review", "Conventional, FHA, VA, USDA, Non-QM & more"],
      ["Income & Asset Analysis", "Self-employed, rental, K-1, 1099, complex income"],
      ["Credit & Liability Review", "DTI, tradelines, judgments, collections"],
      ["AUS Review", "DU, LPA and guideline compliance"],
      ["Condition Strategy", "Clear guidance before and after submission"],
      ["Pre & Post-Closing QC Support", "Identify and resolve defects, ensure compliance"],
    ],
  },
  {
    title: "Construction Services",
    tag: "Plans · Specs · Contracts",
    items: [
      ["Construction File Review", "Draw requests, progress, draws to close"],
      ["Contract Review", "Terms, conditions, pricing, scope"],
      ["Plans Review", "Code compliance, design, measurements"],
      ["Specifications Review", "Materials, quality, industry standards"],
      ["Budget & Change Order Analysis", "Cost tracking, scope changes, approvals"],
      ["Document Verification", "Ensure required documents are complete and accurate"],
    ],
  },
];

const DUE_DILIGENCE = [
  ["Auditing Services", ["Workers' compensation policies", "Policy review & compliance", "Premium & coverage verification", "Loss history & risk assessment"]],
  ["Field Inspections", ["On-site property inspections", "Job site progress", "Safety & compliance checks", "Detailed reporting"]],
  ["Background Checks", ["Employment verification", "Criminal history (as permitted by law)", "Education & credential verification", "Reference checks"]],
  ["Surveillance", ["Discreet & professional", "Property monitoring", "Job site activity", "Custom surveillance solutions"]],
] as const;

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-navy-950 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(201,162,39,0.25),transparent_55%)]" />
          <div className="absolute -right-24 -bottom-24 h-96 w-96 rotate-12 border-[3px] border-gold-500/30" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
            <div>
              <p className="eyebrow text-gold-400">Mortgage · Construction · Due Diligence</p>
              <h1 className="mt-4 font-serif text-4xl leading-tight font-bold text-white sm:text-5xl lg:text-6xl">
                Expert Review.<br />
                <span className="text-gold-400">Solid Decisions.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-white/75">
                Automated underwriting and prequalification for real estate and construction financing — reducing initial
                qualification from days or weeks to <strong className="text-white">minutes</strong>, with experienced professionals behind every file.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/prequalify" className="btn-gold px-6 py-3 text-base">Get Prequalified in Minutes</Link>
                <Link href="/register" className="btn border border-white/30 px-6 py-3 text-base text-white hover:bg-white/10">Start Full Application</Link>
              </div>
              <p className="mt-6 font-serif text-xl text-gold-300 italic">Your project. Our expertise.</p>
            </div>
            <div className="relative">
              <div className="card border-gold-500/30 bg-white p-6 text-navy-900 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="eyebrow">Preliminary Result</div>
                    <div className="mt-1 font-serif text-lg font-bold">Construction Loan · ML-10042</div>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">Prequalified</span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  {[["LTC", "80.9%"], ["LT-ARV", "60.7%"], ["Reserves", "8.2 mo"]].map(([k, v]) => (
                    <div key={k} className="rounded-lg bg-cream p-3">
                      <div className="text-[10px] font-bold tracking-wider text-navy-700 uppercase">{k}</div>
                      <div className="text-xl font-bold">{v}</div>
                    </div>
                  ))}
                </div>
                <ul className="mt-5 space-y-2 text-sm">
                  <li className="flex gap-2"><span className="text-emerald-600">✓</span> Projected completed value exceeds total project cost</li>
                  <li className="flex gap-2"><span className="text-emerald-600">✓</span> Contingency of 7.1% meets the 5% minimum</li>
                  <li className="flex gap-2"><span className="text-emerald-600">✓</span> Licensed general contractor identified</li>
                  <li className="flex gap-2"><span className="text-amber-500">!</span> Provide line-item budget &amp; draw schedule</li>
                </ul>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-navy-900/10">
                  <div className="h-full w-2/5 bg-gold-500" />
                </div>
                <div className="mt-2 flex justify-between text-[10px] font-semibold tracking-wide text-navy-900/50 uppercase">
                  <span>Application</span><span>Prequal</span><span>Underwriting</span><span>Approval</span><span>Closing</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust bar */}
        <section className="border-b border-navy-900/10 bg-white">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 text-center sm:px-6 md:grid-cols-4">
            {[["Minutes", "to initial qualification"], ["6", "loan programs"], ["100%", "confidential"], ["Human", "review on every final decision"]].map(([a, b]) => (
              <div key={b}>
                <div className="font-serif text-3xl font-bold text-navy-900">{a}</div>
                <div className="text-xs font-semibold tracking-wider text-navy-700/70 uppercase">{b}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Platform */}
        <section id="platform" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <p className="eyebrow">The Platform</p>
              <h2 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">An intelligent bridge between borrowers and lenders</h2>
              <p className="mt-4 text-navy-900/70">
                Our configurable, rules-based underwriting engine compares every application against lending criteria set by
                participating lenders. Applications that meet predetermined requirements are identified instantly; files that need
                a closer look are routed to an experienced underwriter with every metric already calculated.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {METRICS.map((m) => (
                  <div key={m} className="flex gap-2 text-sm font-medium"><Check /> {m}</div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {RESULTS.map((r) => (
                <div key={r.label} className="card flex items-center gap-4 p-5">
                  <span className={`h-10 w-2 rounded-full ${r.cls}`} />
                  <div>
                    <div className="font-semibold">{r.label}</div>
                    <div className="text-sm text-navy-900/60">{r.text}</div>
                  </div>
                </div>
              ))}
              <p className="px-1 text-xs text-navy-900/50">
                Every preliminary result explains which financial factors affected it and which conditions remain. Final approval
                remains subject to verification, appraisal, title review and human underwriting.
              </p>
            </div>
          </div>
        </section>

        {/* Programs */}
        <section id="programs" className="bg-navy-900 py-20 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <p className="eyebrow text-gold-400">Loan Programs</p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-white sm:text-4xl">Financing for every stage — from lot to keys</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {LOAN_TYPES.map((t) => {
                const g = DEFAULT_GUIDELINES[t];
                const facts = [
                  g.maxLtv !== null && `Up to ${g.maxLtv}% LTV`,
                  g.maxLtc !== null && `Up to ${g.maxLtc}% LTC`,
                  g.minDscr !== null && `${g.minDscr.toFixed(2)}x min DSCR`,
                  g.maxBackDti !== null && `${g.maxBackDti}% max DTI`,
                  g.minCreditScore !== null && `${g.minCreditScore}+ credit`,
                ].filter(Boolean);
                return (
                  <div key={t} className="rounded-xl border border-white/10 bg-white/5 p-6 transition hover:border-gold-500/60">
                    <h3 className="font-serif text-xl font-bold text-white">{LOAN_TYPE_LABELS[t]}</h3>
                    <p className="mt-2 text-sm text-white/70">{LOAN_TYPE_BLURBS[t]}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {facts.map((f) => (
                        <span key={f as string} className="rounded-full bg-gold-500/15 px-2.5 py-1 text-xs font-semibold text-gold-300">{f}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-6 text-xs text-white/50">Guidelines shown are platform defaults; participating lenders configure their own criteria.</p>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <p className="eyebrow text-center">How It Works</p>
          <h2 className="mt-3 text-center font-serif text-3xl font-bold sm:text-4xl">From application to closing, one secure place</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {[
              ["1", "Apply Online", "Create an account and complete a guided application for your loan program."],
              ["2", "Instant Analysis", "The engine calculates LTV, LTC, DTI, DSCR, cash required and reserves in seconds."],
              ["3", "Clear Conditions", "See exactly what's needed, upload documents and message the lending team."],
              ["4", "Underwriter Decision", "Experienced professionals verify, review and issue the final decision."],
            ].map(([n, t, d]) => (
              <div key={n} className="card p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 font-serif text-lg font-bold text-gold-400">{n}</div>
                <h3 className="mt-4 font-semibold">{t}</h3>
                <p className="mt-2 text-sm text-navy-900/65">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Services */}
        <section id="services" className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <p className="eyebrow">Review &amp; Support Services</p>
            <h2 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">More than a review… it&apos;s peace of mind.</h2>
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {SERVICES.map((s) => (
                <div key={s.title} className="card overflow-hidden">
                  <div className="bg-navy-900 px-6 py-4">
                    <h3 className="font-serif text-xl font-bold text-white">{s.title}</h3>
                    <div className="text-xs font-semibold tracking-wider text-gold-400 uppercase">{s.tag}</div>
                  </div>
                  <ul className="space-y-3 p-6">
                    {s.items.map(([t, d]) => (
                      <li key={t} className="flex gap-3">
                        <Check />
                        <div>
                          <div className="font-semibold">{t}</div>
                          <div className="text-sm text-navy-900/60">{d}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {DUE_DILIGENCE.map(([title, items]) => (
                <div key={title} className="card p-5">
                  <h3 className="font-bold tracking-wide uppercase">{title}</h3>
                  <ul className="mt-3 space-y-1.5 text-sm text-navy-900/70">
                    {items.map((i) => (
                      <li key={i} className="flex gap-2"><Check /> {i}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Guarantees */}
        <section className="bg-navy-950 text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-4">
            {[
              ["Complete Confidentiality", "Your information stays private and encrypted in transit."],
              ["Experienced Professionals", "Skilled, detail-oriented and dedicated to getting it right."],
              ["100% Satisfaction Guarantee*", "On our review services — or your money back."],
              ["No Legal Advice", "We provide information, review and support services only."],
            ].map(([t, d]) => (
              <div key={t} className="text-center">
                <div className="font-bold tracking-wide text-gold-400 uppercase">{t}</div>
                <p className="mt-2 text-sm text-white/70">{d}</p>
              </div>
            ))}
          </div>
          <p className="pb-8 text-center text-[11px] text-white/40">
            *Satisfaction guarantee applies to review services provided and is subject to confidentiality clauses and arbitration agreement. Does not apply to outcomes beyond our control.
          </p>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
          <h2 className="font-serif text-3xl font-bold sm:text-4xl">Mortgage support you can count on.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-navy-900/70">
            Whether it&apos;s a loan, a build, or a business, MACNO Enterprise LLC is here to help. From plans to final draw, we help keep
            your project on track.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/prequalify" className="btn-gold px-6 py-3 text-base">Check My Eligibility</Link>
            <Link href="/register" className="btn-navy px-6 py-3 text-base">Create an Account</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
