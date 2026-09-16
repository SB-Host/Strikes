import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { StrikeCard } from "@/components/strike-card";
import { Age, Countdown } from "@/components/live";
import { Empty, SectionTitle, Stat } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { listStrikes, sortStandings, standings } from "@/lib/strikes";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.must_change_pin) redirect("/me/pin");

  const settings = await getSettings();
  const rows = sortStandings(await standings());
  const mine = rows.find((r) => r.member.id === user.id);
  const strikes = await listStrikes({ memberId: user.id });

  const active = strikes.filter((s) => s.status === "ACTIVE");
  const past = strikes.filter((s) => s.status !== "ACTIVE");
  const todo = active.filter((s) => s.task && !s.task_submitted_at);
  const headroom = Math.max(0, settings.threshold_max - (mine?.weight ?? 0));

  return (
    <Shell user={user} groupName={settings.group_name} active="me">
      {/* The one sentence they open the app to read. */}
      <div className="card mb-6 overflow-hidden">
        <div
          className={`px-5 py-6 ${
            !mine || mine.weight === 0
              ? "bg-emerald-400/[0.07]"
              : mine.tier === "OVER"
                ? "bg-rose-400/[0.07]"
                : mine.tier === "WARNING"
                  ? "bg-orange-400/[0.07]"
                  : "bg-amber-400/[0.06]"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Hey {user.name.split(" ")[0]}
          </p>

          {!mine || mine.weight === 0 ? (
            <>
              <p className="mt-2 text-2xl font-bold text-emerald-300">You&apos;re clear.</p>
              <p className="mt-1 text-sm text-slate-400">
                {mine?.cleanSince ? <>Clean for <Age since={mine.cleanSince} /> now.</> : "No strikes, ever. Keep it there."}
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-2xl font-bold text-white">
                You&apos;re carrying {mine.weight} {mine.weight === 1 ? "point" : "points"}
                {mine.active !== mine.weight && <span className="text-slate-400"> across {mine.active} strikes</span>}.
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {headroom === 0
                  ? `You're at the line. ${settings.consequence}`
                  : `${headroom} more and you hit ${settings.threshold_max}.`}
              </p>
            </>
          )}
        </div>

        {mine && mine.active > 0 && (
          <div className="grid grid-cols-2 gap-px border-t border-white/5 bg-white/5 sm:grid-cols-3">
            <div className="bg-[#10131a] px-4 py-3">
              <p className="text-[0.66rem] uppercase tracking-wider text-slate-500">Oldest one</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-200">
                <Age since={mine.oldestActiveAt!} suffix=" old" />
              </p>
            </div>
            <div className="bg-[#10131a] px-4 py-3">
              <p className="text-[0.66rem] uppercase tracking-wider text-slate-500">Next to drop</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-200">
                {mine.nextExpiry ? <Countdown until={mine.nextExpiry} /> : "None on a timer"}
              </p>
            </div>
            <div className="bg-[#10131a] px-4 py-3">
              <p className="text-[0.66rem] uppercase tracking-wider text-slate-500">Work to do</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-200">
                {todo.length === 0 ? "Nothing assigned" : `${todo.length} task${todo.length === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Active" value={mine?.active ?? 0} />
        <Stat label="Cleared" value={mine?.cleared ?? 0} hint="you worked these off" />
        <Stat label="All-time" value={mine?.lifetime ?? 0} hint="every strike ever" />
      </div>

      {todo.length > 0 && (
        <div className="mb-6">
          <SectionTitle note="do these and a leader signs off">Your way out</SectionTitle>
          <div className="space-y-2">
            {todo.map((s) => (
              <StrikeCard
                key={s.id} strike={s} viewerRole={user.role} viewerId={user.id}
                showMember={false} allowAppeals={settings.allow_appeals}
              />
            ))}
          </div>
        </div>
      )}

      <SectionTitle note={active.length ? `${active.length} active` : undefined}>Your strikes</SectionTitle>
      {active.filter((s) => !todo.includes(s)).length === 0 && todo.length === 0 ? (
        <Empty title="Nothing active" note="Nice. This is where they'd show up." />
      ) : (
        <div className="space-y-2">
          {active.filter((s) => !todo.includes(s)).map((s) => (
            <StrikeCard
              key={s.id} strike={s} viewerRole={user.role} viewerId={user.id}
              showMember={false} allowAppeals={settings.allow_appeals}
            />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="mt-8">
          <SectionTitle note={`${past.length} closed`}>History</SectionTitle>
          <div className="space-y-2">
            {past.map((s) => (
              <StrikeCard
                key={s.id} strike={s} viewerRole={user.role} viewerId={user.id}
                showMember={false} allowAppeals={settings.allow_appeals}
              />
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}
