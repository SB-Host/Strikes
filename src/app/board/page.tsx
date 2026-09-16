import { redirect } from "next/navigation";
import { QuickIssue } from "@/components/quick-issue";
import { Shell } from "@/components/shell";
import { Age } from "@/components/live";
import { Avatar, Empty, MemberLink, SectionTitle, Stat, TierChip } from "@/components/ui";
import { AppealQueue } from "@/components/appeals";
import { currentUser, isLeader } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { groupStats, listMembers, openAppeals, sortStandings, standings } from "@/lib/strikes";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.must_change_pin) redirect("/me/pin");

  const settings = await getSettings();
  const leader = isLeader(user.role);

  // Visibility is the group's call, but leaders always see the whole board.
  if (settings.visibility === "PRIVATE" && !leader) {
    return (
      <Shell user={user} groupName={settings.group_name} active="board">
        <Empty
          title="The group board is turned off"
          note="Your leaders have this set to private, so you only see your own strikes. Head to the You tab."
        />
      </Shell>
    );
  }

  const rows = sortStandings(await standings());
  const stats = await groupStats();
  const appeals = leader ? await openAppeals() : [];
  const members = leader ? await listMembers() : [];

  const carrying = rows.filter((r) => r.active > 0);
  const clean = rows.filter((r) => r.active === 0);
  const pendingReview = rows.reduce((sum, r) => sum + r.pendingTasks, 0);
  const trend = stats.last30 - stats.prev30;
  const hideDetail = settings.visibility === "COUNTS" && !leader;

  return (
    <Shell user={user} groupName={settings.group_name} active="board">
      {leader && (
        <div className="mb-6">
          <QuickIssue members={members} presets={settings.presets} defaultExpiryDays={settings.default_expiry_days} />
        </div>
      )}

      {leader && appeals.length > 0 && (
        <div className="mb-6">
          <SectionTitle note={`${appeals.length} waiting`}>Disputes to look at</SectionTitle>
          <AppealQueue appeals={appeals} />
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Carrying strikes" value={carrying.length} hint={`of ${rows.length} people`} />
        <Stat label="Clean" value={clean.length} hint="nothing active" />
        <Stat
          label="Last 30 days"
          value={stats.last30}
          hint={trend === 0 ? "same as the month before" : trend > 0 ? `${trend} more than last month` : `${Math.abs(trend)} fewer than last month`}
        />
        <Stat
          label="Typical time held"
          value={stats.avgHeldDays > 0 ? `${stats.avgHeldDays.toFixed(1)}d` : "—"}
          hint="issued until cleared"
        />
      </div>

      <SectionTitle note={`${settings.threshold_max} is the line`}>Where everyone stands</SectionTitle>

      {rows.length === 0 ? (
        <Empty title="Nobody on the roster yet" note="Add your people from the Roster tab." />
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const you = row.member.id === user.id;
            return (
              <div
                key={row.member.id}
                className={`card flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02] ${
                  you ? "ring-1 ring-indigo-400/25" : ""
                }`}
              >
                <Avatar name={row.member.name} accent={row.member.accent} />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <MemberLink id={row.member.id}>
                      <span className="text-sm font-semibold text-slate-100">{row.member.name}</span>
                    </MemberLink>
                    {you && <span className="chip border-indigo-400/30 bg-indigo-400/10 text-indigo-300">You</span>}
                    {row.member.role !== "MEMBER" && (
                      <span className="chip border-white/10 bg-white/5 text-slate-400">
                        {row.member.role === "OWNER" ? "Owner" : "Leader"}
                      </span>
                    )}
                    {row.pendingTasks > 0 && (
                      <span className="chip border-amber-400/30 bg-amber-400/10 text-amber-300">
                        {row.pendingTasks} awaiting review
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {hideDetail ? (
                      row.active > 0 ? "Carrying strikes" : "Clean"
                    ) : row.active > 0 ? (
                      <>
                        oldest one <Age since={row.oldestActiveAt!} suffix=" old" />
                        {row.cleared > 0 && ` · ${row.cleared} cleared all-time`}
                      </>
                    ) : row.cleanSince ? (
                      <>clean for <Age since={row.cleanSince} /></>
                    ) : (
                      "never had one"
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <TierChip tier={row.tier} />
                  <div className="w-11 text-right">
                    <p
                      className={`text-2xl font-bold leading-none tabular-nums ${
                        row.weight === 0 ? "text-slate-600"
                          : row.tier === "OVER" ? "text-rose-400"
                          : row.tier === "WARNING" ? "text-orange-400"
                          : row.tier === "WATCH" ? "text-amber-300"
                          : "text-slate-300"
                      }`}
                    >
                      {row.weight}
                    </p>
                    {row.active !== row.weight && (
                      <p className="text-[0.62rem] text-slate-600">{row.active} strike{row.active === 1 ? "" : "s"}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pendingReview > 0 && leader && (
        <p className="mt-4 text-xs text-amber-300/80">
          {pendingReview} piece{pendingReview === 1 ? "" : "s"} of clearing work {pendingReview === 1 ? "is" : "are"} waiting on a leader to sign off.
        </p>
      )}

      {stats.byCategory.length > 0 && !hideDetail && (
        <div className="mt-8">
          <SectionTitle note="every strike ever logged">What trips people up</SectionTitle>
          <div className="card space-y-2.5 p-4">
            {stats.byCategory.slice(0, 6).map((c) => {
              const max = stats.byCategory[0].n || 1;
              return (
                <div key={c.category} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 truncate text-xs text-slate-400">{c.category}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-indigo-400/70" style={{ width: `${(c.n / max) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right text-xs tabular-nums text-slate-500">{c.n}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {settings.consequence && (
        <p className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-slate-400">
          <span className="font-semibold text-slate-300">At {settings.threshold_max}:</span> {settings.consequence}
        </p>
      )}
    </Shell>
  );
}
