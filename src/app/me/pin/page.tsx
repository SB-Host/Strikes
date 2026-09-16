import { redirect } from "next/navigation";
import { changePinAction } from "@/app/actions";
import { currentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { PinForm } from "./form";

export const dynamic = "force-dynamic";

export default async function PinPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const settings = await getSettings();

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-white">Pick your own PIN</h1>
          <p className="mt-1.5 text-sm text-slate-400">
            {user.must_change_pin
              ? `Welcome to ${settings.group_name}, ${user.name.split(" ")[0]}. Set something only you know.`
              : "Change the PIN you use to sign in."}
          </p>
        </div>
        <div className="card p-5">
          <PinForm action={changePinAction} />
        </div>
      </div>
    </div>
  );
}
