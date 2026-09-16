import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { StrikeCard } from "@/components/strike-card";
import { Age, Countdown } from "@/components/live";
import { Avatar, Empty, SectionTitle, Stat, TierChip } from "@/components/ui";
import { currentUser, isLeader } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { listStrikes, sortStandings, standings } from "@/lib/strikes";

export const dynamic = "force-dynamic";

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.must_change_pin) redirect("/me/pin");

  // Your own profile is just the You tab.
  if (id === user.id) redirect("/me");

  const settings = await getSettings();
  const leader = isLeader(user.role);
  if (settings.visibility === "PRIVATE" && !leader) redirect("/me");

  const rows = sortStandings(await standings());
  const row = rows.find((r) => r.member.id === id);
  if (!row) notFound();

  const hideDetail = settings.visibility === "COUNTS" && !leader;
  const strikes = hideDetail ? [] : await listStrikes({ memberId: id });
  const active = strikes.filter((s) => s.status === "ACTIVE");
  const past = strikes.filter((s) => s.status !== "ACTIVE");

  return (
    <Shell user={user} groupName={settings.group_name} active="board">
      <Link href="/board" className="mb-4 inline-block text-xs text-slate-500 hover:text-slate-300">
        ← Back to the board
      </Link>

      <div className="card mb-6 flex flex-wrap items-center gap-4 p-5">
        <Avatar name={row.member.name} accent={row.member.accent} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold text-white">{row.member.name}</h1>
            <TierChip tier={row.tier} />
            {row.member.role !== "MEMBER" && (
              <span className="chip border-white/10 bg-white/5 text-slate-400">
                {row.member.role === "OWNER" ? "Owner" : "Leader"}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {row.active > 0 ? (
              <>oldest strike is <Age since={row.oldestActiveAt!} suffix=" old" />
                {row.nextExpiry && <> · next drops in <Countdown until={row.nextExpiry} /></>}
              </>
            ) : row.cleanSince ? (
              <>clean for <Age since={row.cleanSince} /></>
            ) : (
              "never had a strike"
            )}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-4xl font-bold tabular-nums ${row.weight === 0 ? "text-slate-600" : "text-rose-400"}`}>
            {row.weight}
          </p>
          <p className="text-[0.66rem] uppercase tracking-wider text-slate-500">of {settings.threshold_max}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Active" value={row.active} />
        <Stat label="Cleared" value={row.cleared} />
        <Stat label="All-time" value={row.lifetime} />
      </div>

      {hideDetail ? (
        <Empty
          title="Counts only"
          note="Your leaders have the board set to show numbers without the reasons behind them."
        />
      ) : (
        <>
          <SectionTitle note={active.length ? `${active.length} active` : undefined}>Active</SectionTitle>
          {active.length === 0 ? (
            <Empty title="Nothing active" />
          ) : (
            <div className="space-y-2">
              {active.map((s) => (
                <StrikeCard key={s.id} strike={s} viewerRole={user.role} viewerId={user.id} showMember={false} />
              ))}
            </div>
          )}

          {past.length > 0 && (
            <div className="mt-8">
              <SectionTitle note={`${past.length} closed`}>History</SectionTitle>
              <div className="space-y-2">
                {past.map((s) => (
                  <StrikeCard key={s.id} strike={s} viewerRole={user.role} viewerId={user.id} showMember={false} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
