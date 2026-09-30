"use client";

import { useActionState, useEffect, useRef } from "react";
import { postMessageAction, uploadDocumentAction } from "@/app/actions/applications";
import { addConditionAction, recordDecisionAction } from "@/app/actions/underwriter";
import { DOC_CATEGORIES } from "@/lib/underwriting/engine";

type State = { error?: string; ok?: string };

function Feedback({ state }: { state: State }) {
  if (state.error) return <p className="text-xs text-rose-700">{state.error}</p>;
  if (state.ok) return <p className="text-xs text-emerald-700">{state.ok}</p>;
  return null;
}

/** Reset a form after a successful submit. */
function useResetOnOk(state: State) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

export function UploadForm({ applicationId, conditionId, defaultCategory, compact = false }: { applicationId: string; conditionId?: string; defaultCategory?: string | null; compact?: boolean }) {
  const [state, action, pending] = useActionState<State, FormData>(uploadDocumentAction, {});
  const ref = useResetOnOk(state);
  return (
    <form ref={ref} action={action} className={compact ? "flex flex-wrap items-center gap-2" : "space-y-3"}>
      <input type="hidden" name="applicationId" value={applicationId} />
      {conditionId && <input type="hidden" name="conditionId" value={conditionId} />}
      {compact ? (
        <input type="hidden" name="category" value={defaultCategory ?? "other"} />
      ) : (
        <div>
          <label className="label" htmlFor="category">Document type</label>
          <select id="category" name="category" className="input" defaultValue={defaultCategory ?? "other"}>
            {Object.entries(DOC_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      )}
      <input
        type="file"
        name="file"
        required
        accept=".pdf,.png,.jpg,.jpeg,.heic,.doc,.docx,.xls,.xlsx,.csv,.txt"
        className="block text-xs file:mr-3 file:rounded-md file:border-0 file:bg-navy-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
      />
      <button className={compact ? "btn-outline px-3 py-1.5 text-xs" : "btn-navy w-full"} disabled={pending}>
        {pending ? "Uploading…" : "Upload"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function MessageForm({ applicationId, staff = false }: { applicationId: string; staff?: boolean }) {
  const [state, action, pending] = useActionState<State, FormData>(postMessageAction, {});
  const ref = useResetOnOk(state);
  return (
    <form ref={ref} action={action} className="space-y-2">
      <input type="hidden" name="applicationId" value={applicationId} />
      <textarea name="body" rows={3} required placeholder={staff ? "Message the borrower or add an internal note…" : "Message the lending team…"} className="input" />
      <div className="flex items-center justify-between gap-3">
        {staff ? (
          <label className="flex items-center gap-2 text-xs text-navy-900/70">
            <input type="checkbox" name="internal" /> Internal note (hidden from borrower)
          </label>
        ) : <span />}
        <button className="btn-navy px-4 py-2" disabled={pending}>{pending ? "Sending…" : "Send"}</button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function DecisionForm({ applicationId, engineDecision }: { applicationId: string; engineDecision: string | null }) {
  const [state, action, pending] = useActionState<State, FormData>(recordDecisionAction, {});
  const ref = useResetOnOk(state);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <div>
        <label className="label" htmlFor="decision">Action</label>
        <select id="decision" name="decision" className="input" required defaultValue="">
          <option value="" disabled>Select…</option>
          <option value="in_review">Move to underwriting review</option>
          <option value="request_info">Request information from borrower</option>
          <option value="conditional">Conditionally approve</option>
          <option value="approve">Approve</option>
          <option value="decline">Decline</option>
          <option value="clear_to_close">Clear to close</option>
          <option value="closed">Mark closed / funded</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="note">Note to borrower / justification</label>
        <textarea id="note" name="note" rows={3} className="input" placeholder="Required for declines, information requests and overrides." />
      </div>
      {engineDecision === "MANUAL_REVIEW" && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          The engine flagged this file for manual review. Approving it is recorded as an override and requires a justification.
        </p>
      )}
      <button className="btn-gold w-full" disabled={pending}>{pending ? "Saving…" : "Record decision"}</button>
      <Feedback state={state} />
    </form>
  );
}

export function AddConditionForm({ applicationId }: { applicationId: string }) {
  const [state, action, pending] = useActionState<State, FormData>(addConditionAction, {});
  const ref = useResetOnOk(state);
  return (
    <form ref={ref} action={action} className="space-y-2">
      <input type="hidden" name="applicationId" value={applicationId} />
      <input name="description" required placeholder="e.g. Provide 2024 business tax returns" className="input" />
      <div className="flex gap-2">
        <select name="category" className="input" defaultValue="other">
          {Object.entries(DOC_CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button className="btn-navy shrink-0" disabled={pending}>Add</button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
