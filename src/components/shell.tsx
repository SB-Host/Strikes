import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { isLeader } from "@/lib/auth";
import type { Member } from "@/lib/types";
import { Avatar } from "./ui";

export function Shell({
  user, groupName, active, children,
}: {
  user: Member;
  groupName: string;
  active: string;
  children: React.ReactNode;
}) {
  const leader = isLeader(user.role);
  const tabs = [
    { href: "/me", label: "You", key: "me" },
    { href: "/board", label: "Board", key: "board" },
    { href: "/feed", label: "Activity", key: "feed" },
    ...(leader ? [{ href: "/roster", label: "Roster", key: "roster" }] : []),
    ...(user.role === "OWNER" ? [{ href: "/admin", label: "Settings", key: "admin" }] : []),
  ];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 pb-24 sm:px-6">
      <header className="flex items-center justify-between gap-3 py-5">
        <div className="min-w-0">
          <Link href="/me" className="block truncate text-base font-bold tracking-tight text-white">
            {groupName}
          </Link>
          <p className="text-[0.7rem] uppercase tracking-[0.18em] text-slate-500">Strike board</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden text-right sm:block">
            <p className="text-xs font-semibold text-slate-200">{user.name}</p>
            <p className="text-[0.68rem] text-slate-500">
              {user.role === "OWNER" ? "Owner" : user.role === "LEADER" ? "Leader" : "Member"}
            </p>
          </div>
          <Avatar name={user.name} accent={user.accent} size="sm" />
          <form action={logoutAction}>
            <button className="btn btn-ghost px-2.5 py-1.5 text-xs" type="submit">Sign out</button>
          </form>
        </div>
      </header>

      <nav className="sticky top-0 z-20 -mx-4 mb-5 border-b border-white/5 bg-[#0a0c10]/85 px-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={t.href}
              className={`relative whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors ${
                active === t.key ? "text-white" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {t.label}
              {active === t.key && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-indigo-400" />
              )}
            </Link>
          ))}
        </div>
      </nav>

      <main className="flex-1">{children}</main>

      <footer className="pt-10 text-center text-[0.68rem] text-slate-600">
        Every change here is logged with a name and a timestamp.
      </footer>
    </div>
  );
}
