"use client";

import { ActionForm, Submit, type Result } from "@/components/form";

export function LoginForm({ action }: { action: (prev: Result, fd: FormData) => Promise<Result> }) {
  return (
    <ActionForm action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="handle">Username</label>
        <input
          id="handle" name="handle" className="field" autoCapitalize="none" autoCorrect="off"
          autoComplete="username" placeholder="firstname" required
        />
      </div>
      <div>
        <label className="label" htmlFor="pin">PIN</label>
        <input
          id="pin" name="pin" type="password" inputMode="numeric" className="field tracking-[0.35em]"
          autoComplete="current-password" placeholder="••••••" required
        />
      </div>
      <Submit className="btn btn-primary w-full" pending="Checking…">Sign in</Submit>
    </ActionForm>
  );
}
