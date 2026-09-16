"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

export type Result = { ok: boolean; error?: string; message?: string };
export const EMPTY: Result = { ok: false };

export function Submit({
  children, className = "btn btn-primary", pending: label,
}: { children: React.ReactNode; className?: string; pending?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? (label ?? "Working…") : children}
    </button>
  );
}

/**
 * Wraps a server action with inline success/error feedback, and optionally
 * resets the form once it goes through.
 */
export function ActionForm({
  action, children, className, resetOnSuccess = false, onDone,
}: {
  action: (prev: Result, fd: FormData) => Promise<Result>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  onDone?: () => void;
}) {
  const [state, formAction] = useActionState(action, EMPTY);
  const ref = useRef<HTMLFormElement>(null);
  const seen = useRef<Result>(EMPTY);

  useEffect(() => {
    if (state !== seen.current && state.ok) {
      seen.current = state;
      if (resetOnSuccess) ref.current?.reset();
      onDone?.();
    }
  }, [state, resetOnSuccess, onDone]);

  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state.error && (
        <p className="rise rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
          {state.error}
        </p>
      )}
      {state.ok && state.message && (
        <p className="rise rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
          {state.message}
        </p>
      )}
    </form>
  );
}

/** A disclosure that keeps leader tools out of the way until they're needed. */
export function Reveal({
  label, children, tone = "ghost",
}: { label: string; children: React.ReactNode; tone?: "ghost" | "warn" | "good" }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} className={`btn btn-${tone} text-xs`}>
        {open ? "Cancel" : label}
      </button>
      {open && <div className="rise mt-2">{children}</div>}
    </div>
  );
}
