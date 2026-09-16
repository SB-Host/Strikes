import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions";
import { currentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { LoginForm } from "./form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentUser()) redirect("/");
  const settings = await getSettings();

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 ring-1 ring-indigo-400/30">
            <span className="text-xl">⚖️</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">{settings.group_name}</h1>
          <p className="mt-1 text-sm text-slate-400">Sign in to see where you stand.</p>
        </div>

        <div className="card p-5">
          <LoginForm action={loginAction} />
        </div>

        <p className="mt-5 text-center text-xs text-slate-600">
          Don&apos;t have a PIN? Ask one of your leaders — they can make you one in a few seconds.
        </p>
      </div>
    </div>
  );
}
