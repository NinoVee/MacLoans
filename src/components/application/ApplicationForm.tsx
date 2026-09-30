"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { STEPS, visibleFields, type FieldDef } from "./fields";
import { LOAN_TYPES, LOAN_TYPE_BLURBS, LOAN_TYPE_LABELS, type ApplicationData, type LoanType, type UnderwritingResult } from "@/lib/underwriting/types";
import { saveApplicationAction, submitApplicationAction } from "@/app/actions/applications";
import { quickPrequalAction } from "@/app/actions/prequal";
import { UnderwritingReport } from "@/components/UnderwritingReport";

interface Props {
  mode: "full" | "quick";
  applicationId?: string | null;
  initialLoanType?: LoanType;
  initialData?: ApplicationData;
}

const emptyData = (): ApplicationData => ({ borrower: {}, property: {}, loan: { purpose: "purchase" }, construction: {} });

export function ApplicationForm({ mode, applicationId = null, initialLoanType, initialData }: Props) {
  const quick = mode === "quick";
  const [id, setId] = useState<string | null>(applicationId);
  const [loanType, setLoanType] = useState<LoanType | null>(initialLoanType ?? null);
  const [data, setData] = useState<ApplicationData>(() => ({ ...emptyData(), ...(initialData ?? {}) }));
  const [stepIndex, setStepIndex] = useState(initialLoanType ? 1 : 0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<UnderwritingResult | null>(null);
  const [pending, startTransition] = useTransition();

  const steps = useMemo(() => {
    const s = STEPS.filter((st) => !loanType || !st.show || st.show(loanType));
    return [{ id: "program", title: "Loan Program" }, ...s, { id: "review", title: quick ? "Result" : "Review & Submit" }];
  }, [loanType, quick]);
  const current = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  const setField = (f: FieldDef, value: unknown) =>
    setData((d) => ({ ...d, [f.section]: { ...(d[f.section] ?? {}), [f.key]: value } }));
  const getField = (f: FieldDef) => (data[f.section] as Record<string, unknown> | undefined)?.[f.key];

  function go(delta: number) {
    setError(null);
    setNotice(null);
    const next = stepIndex + delta;
    if (next < 0 || next >= steps.length) return;
    if (stepIndex === 0 && !loanType) return setError("Choose a loan program to continue.");
    setStepIndex(next);
    if (steps[next].id === "review" && quick) runQuick();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function runQuick() {
    if (!loanType) return;
    startTransition(async () => {
      const r = await quickPrequalAction(loanType, data);
      if ("error" in r) setError(r.error);
      else setResult(r);
    });
  }

  function saveDraft() {
    if (!loanType) return setError("Choose a loan program first.");
    startTransition(async () => {
      const r = await saveApplicationAction(id, loanType, data);
      if (r.error) setError(r.error);
      else {
        setId(r.id!);
        if (!id) window.history.replaceState(null, "", `/dashboard/applications/${r.id}/edit`);
        setNotice("Draft saved.");
      }
    });
  }

  function submit() {
    if (!loanType) return;
    startTransition(async () => {
      const r = await submitApplicationAction(id, loanType, data);
      if (r?.error) setError(r.error);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <ol className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
        {steps.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => {
                if (!loanType && i > 0) return;
                setStepIndex(i);
                if (quick && s.id === "review") runQuick();
              }}
              className={`flex w-full items-center gap-3 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm transition ${
                i === stepIndex ? "bg-navy-900 font-semibold text-white" : i < stepIndex ? "text-navy-900 hover:bg-navy-900/5" : "text-navy-900/50 hover:bg-navy-900/5"
              }`}
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i === stepIndex ? "bg-gold-500 text-navy-950" : i < stepIndex ? "bg-gold-300 text-navy-900" : "bg-navy-900/10"}`}>
                {i < stepIndex ? "✓" : i + 1}
              </span>
              {s.title}
            </button>
          </li>
        ))}
      </ol>

      <div className="card p-6 sm:p-8">
        {current.id === "program" && (
          <div>
            <h2 className="font-serif text-2xl font-bold">Choose a loan program</h2>
            <p className="mt-1 text-sm text-navy-900/60">Each program is evaluated against its own lender guidelines.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {LOAN_TYPES.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setLoanType(t)}
                  className={`rounded-lg border p-4 text-left transition ${loanType === t ? "border-gold-500 bg-gold-300/20 ring-2 ring-gold-500/40" : "border-navy-900/15 hover:border-navy-900/40"}`}
                >
                  <div className="font-semibold">{LOAN_TYPE_LABELS[t]}</div>
                  <div className="mt-1 text-xs text-navy-900/60">{LOAN_TYPE_BLURBS[t]}</div>
                </button>
              ))}
            </div>
            {loanType && loanType !== "land" && (
              <div className="mt-6 max-w-sm">
                <label className="label" htmlFor="purpose">Loan purpose</label>
                <select
                  id="purpose"
                  className="input"
                  value={data.loan.purpose ?? "purchase"}
                  onChange={(e) => setData((d) => ({ ...d, loan: { ...d.loan, purpose: e.target.value as ApplicationData["loan"]["purpose"] } }))}
                >
                  <option value="purchase">{loanType === "construction" || loanType === "construction_perm" ? "New construction" : "Purchase"}</option>
                  <option value="refinance">Rate / term refinance</option>
                  <option value="cash_out">Cash-out refinance</option>
                </select>
              </div>
            )}
          </div>
        )}

        {current.id !== "program" && current.id !== "review" && loanType && (() => {
          const step = STEPS.find((s) => s.id === current.id)!;
          const fields = visibleFields(step, loanType, data, quick);
          return (
            <div>
              <h2 className="font-serif text-2xl font-bold">{step.title}</h2>
              <p className="mt-1 text-sm text-navy-900/60">{step.description}</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {fields.map((f) => (
                  <Field key={f.key} def={f} value={getField(f)} onChange={(v) => setField(f, v)} />
                ))}
              </div>
            </div>
          );
        })()}

        {current.id === "review" && loanType && (
          <div>
            {quick ? (
              <>
                <h2 className="font-serif text-2xl font-bold">Your instant prequalification</h2>
                <p className="mt-1 text-sm text-navy-900/60">{LOAN_TYPE_LABELS[loanType]} · nothing has been saved.</p>
                <div className="mt-6">
                  {pending && <p className="text-sm">Analyzing…</p>}
                  {result && !pending && <UnderwritingReport loanType={loanType} result={result} />}
                </div>
                <div className="mt-8 rounded-lg bg-navy-900 p-5 text-white">
                  <div className="font-serif text-lg font-bold">Ready to move forward?</div>
                  <p className="mt-1 text-sm text-white/70">Create a free account to submit a full application, upload documents and track your loan to closing.</p>
                  <Link href="/register" className="btn-gold mt-4">Create my account</Link>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-serif text-2xl font-bold">Review &amp; submit</h2>
                <p className="mt-1 text-sm text-navy-900/60">
                  Submitting runs automated underwriting immediately. You&apos;ll see your preliminary result and any outstanding conditions on
                  the next screen.
                </p>
                <ReviewSummary loanType={loanType} data={data} />
                <label className="mt-6 flex items-start gap-3 rounded-md bg-cream p-4 text-xs text-navy-900/70">
                  <input type="checkbox" required id="consent" className="mt-0.5" />
                  I certify the information provided is true and complete to the best of my knowledge, and I authorize MACNO Enterprise LLC and
                  participating lenders to verify it. I understand a preliminary result is not a commitment to lend.
                </label>
              </>
            )}
          </div>
        )}

        {error && <p className="mt-6 rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        {notice && <p className="mt-6 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-navy-900/10 pt-6">
          <button type="button" className="btn-ghost" onClick={() => go(-1)} disabled={stepIndex === 0 || pending}>
            ← Back
          </button>
          <div className="flex gap-2">
            {!quick && loanType && (
              <button type="button" className="btn-outline" onClick={saveDraft} disabled={pending}>
                Save draft
              </button>
            )}
            {!isLast && (
              <button type="button" className="btn-navy" onClick={() => go(1)} disabled={pending || (stepIndex === 0 && !loanType)}>
                {steps[stepIndex + 1]?.id === "review" && quick ? "See my result →" : "Continue →"}
              </button>
            )}
            {isLast && !quick && (
              <button
                type="button"
                className="btn-gold"
                disabled={pending}
                onClick={() => {
                  const c = document.getElementById("consent") as HTMLInputElement | null;
                  if (c && !c.checked) return setError("Please confirm the certification to submit.");
                  submit();
                }}
              >
                {pending ? "Analyzing…" : "Submit for underwriting"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ def, value, onChange }: { def: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const id = `${def.section}-${def.key}`;
  if (def.type === "bool") {
    return (
      <label htmlFor={id} className="flex cursor-pointer items-center gap-3 rounded-md border border-navy-900/15 px-3 py-2.5 text-sm hover:border-navy-900/30 sm:col-span-1">
        <input id={id} type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-navy-900" />
        {def.label}
      </label>
    );
  }
  const numeric = def.type === "money" || def.type === "number" || def.type === "percent";
  return (
    <div className={def.wide ? "sm:col-span-2" : ""}>
      <label className="label" htmlFor={id}>{def.label}</label>
      {def.type === "select" ? (
        <select id={id} className="input" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || undefined)}>
          <option value="">Select…</option>
          {def.options!.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      ) : (
        <div className="relative">
          {def.type === "money" && <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-navy-900/40">$</span>}
          <input
            id={id}
            className={`input ${def.type === "money" ? "pl-7" : ""} ${def.type === "percent" ? "pr-8" : ""}`}
            inputMode={numeric ? "decimal" : undefined}
            value={numeric ? formatNum(value) : ((value as string) ?? "")}
            onChange={(e) => {
              if (!numeric) return onChange(e.target.value);
              const raw = e.target.value.replace(/[^0-9.]/g, "");
              onChange(raw === "" ? undefined : raw.endsWith(".") ? raw : Number(raw));
            }}
          />
          {def.type === "percent" && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-navy-900/40">%</span>}
        </div>
      )}
      {def.hint && <p className="mt-1 text-[11px] text-navy-900/50">{def.hint}</p>}
    </div>
  );
}

function formatNum(v: unknown) {
  if (v === undefined || v === null || v === "") return "";
  if (typeof v === "string") return v;
  return Number(v).toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function ReviewSummary({ loanType, data }: { loanType: LoanType; data: ApplicationData }) {
  const steps = STEPS.filter((s) => !s.show || s.show(loanType));
  return (
    <div className="mt-6 space-y-5">
      <div className="text-sm">
        <span className="font-semibold">Program:</span> {LOAN_TYPE_LABELS[loanType]} · <span className="capitalize">{(data.loan.purpose ?? "purchase").replace("_", "-")}</span>
      </div>
      {steps.map((s) => {
        const fields = visibleFields(s, loanType, data, false);
        return (
          <div key={s.id}>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-navy-700">{s.title}</h3>
            <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {fields.map((f) => {
                const v = (data[f.section] as Record<string, unknown> | undefined)?.[f.key];
                let shown: string;
                if (v === undefined || v === "") shown = "—";
                else if (f.type === "bool") shown = v ? "Yes" : "No";
                else if (f.type === "money") shown = `$${formatNum(v)}`;
                else if (f.type === "percent") shown = `${v}%`;
                else if (f.type === "select") shown = f.options?.find(([k]) => k === v)?.[1] ?? String(v);
                else shown = typeof v === "number" ? formatNum(v) : String(v);
                return (
                  <div key={f.key} className="flex justify-between gap-4 border-b border-navy-900/5 py-1">
                    <dt className="text-navy-900/60">{f.label}</dt>
                    <dd className="text-right font-medium">{shown}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
