import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { RosterTools } from "@/components/roster-tools";
import { Age } from "@/components/live";
import { Avatar, SectionTitle } from "@/components/ui";
import { currentUser, isLeader } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { listMembers } from "@/lib/strikes";

export const dynamic = "force-dynamic";

export default async function RosterPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.must_change_pin) redirect("/me/pin");
  if (!isLeader(user.role)) redirect("/me");

  const settings = await getSettings();
  const members = await listMembers(true);
  const active = members.filter((m) => m.status === "ACTIVE");
  const inactive = members.filter((m) => m.status !== "ACTIVE");

  return (
    <Shell user={user} groupName={settings.group_name} active="roster">
      <SectionTitle note={`${active.length} on the roster`}>Add someone</SectionTitle>
      <RosterTools members={members} isOwner={user.role === "OWNER"} selfId={user.id} />

      <div className="mt-8">
        <SectionTitle>Who&apos;s on it</SectionTitle>
        <div className="card divide-y divide-white/5">
          {active.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={m.name} accent={m.accent} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-100">{m.name}</p>
                <p className="text-xs text-slate-500">
                  @{m.handle}
                  {m.must_change_pin && <span className="ml-2 text-amber-400/80">hasn&apos;t set their PIN</span>}
                  {m.last_seen_at && <span className="ml-2">last in <Age since={m.last_seen_at} suffix=" ago" /></span>}
                </p>
              </div>
              <span className="chip border-white/10 bg-white/5 text-slate-400">
                {m.role === "OWNER" ? "Owner" : m.role === "LEADER" ? "Leader" : "Member"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {inactive.length > 0 && (
        <div className="mt-8">
          <SectionTitle note="their history is kept">Off the roster</SectionTitle>
          <div className="card divide-y divide-white/5">
            {inactive.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3 opacity-60">
                <Avatar name={m.name} accent={m.accent} size="sm" />
                <p className="flex-1 truncate text-sm text-slate-300">{m.name}</p>
                <span className="text-xs text-slate-500">@{m.handle}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}
