"use client";

import { useFormStatus } from "react-dom";
import { resolveAppealAction } from "@/app/actions";
import type { Appeal } from "@/lib/types";
import { ActionForm } from "./form";
import { Age } from "./live";

/** Two explicit outcomes, each carrying its own decision value. */
function Decide({ value, className, children }: { value: string; className: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name="decision" value={value} className={className} disabled={pending}>
      {pending ? "Saving…" : children}
    </button>
  );
}

export function AppealQueue({ appeals }: { appeals: Appeal[] }) {
  return (
    <div className="space-y-2">
      {appeals.map((a) => (
        <div key={a.id} className="card border-violet-400/20 p-4">
          <p className="text-sm">
            <span className="font-semibold text-white">{a.member_name}</span>
            <span className="text-slate-400"> is disputing </span>
            <span className="text-slate-200">&ldquo;{a.reason}&rdquo;</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            sent <Age since={a.created_at} suffix=" ago" />
          </p>
          <p className="mt-2 rounded-lg bg-white/[0.03] px-3 py-2 text-xs leading-relaxed text-slate-300">
            {a.message}
          </p>

          <ActionForm action={resolveAppealAction} className="mt-3 space-y-2">
            <input type="hidden" name="appealId" value={a.id} />
            <input name="response" className="field" placeholder="Your answer — they'll see this" />
            <div className="flex flex-wrap gap-2">
              <Decide value="grant" className="btn btn-good">Fair point — remove it</Decide>
              <Decide value="uphold" className="btn btn-ghost">It stands</Decide>
            </div>
          </ActionForm>
        </div>
      ))}
    </div>
  );
}
