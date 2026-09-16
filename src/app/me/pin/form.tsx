"use client";

import { ActionForm, Submit, type Result } from "@/components/form";

export function PinForm({ action }: { action: (prev: Result, fd: FormData) => Promise<Result> }) {
  return (
    <ActionForm action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="pin">New PIN (4–8 digits)</label>
        <input
          id="pin" name="pin" type="password" inputMode="numeric" className="field tracking-[0.35em]"
          autoComplete="new-password" placeholder="••••••" required
        />
      </div>
      <div>
        <label className="label" htmlFor="confirm">Type it again</label>
        <input
          id="confirm" name="confirm" type="password" inputMode="numeric" className="field tracking-[0.35em]"
          autoComplete="new-password" placeholder="••••••" required
        />
      </div>
      <Submit className="btn btn-primary w-full" pending="Saving…">Save and continue</Submit>
    </ActionForm>
  );
}
