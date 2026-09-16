import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { Age } from "@/components/live";
import { Empty, SectionTitle } from "@/components/ui";
import { currentUser, isLeader } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { recentEvents } from "@/lib/strikes";

export const dynamic = "force-dynamic";

const DOT: Record<string, string> = {
  STRIKE_ISSUED: "bg-rose-400",
  STRIKE_CLEARED: "bg-emerald-400",
  STRIKE_EXPIRED: "bg-sky-400",
  STRIKE_VOIDED: "bg-slate-500",
  STRIKE_EXTENDED: "bg-amber-400",
  TASK_SUBMITTED: "bg-indigo-400",
  TASK_REJECTED: "bg-orange-400",
  APPEAL_OPENED: "bg-violet-400",
  APPEAL_DENIED: "bg-violet-400",
  MEMBER_ADDED: "bg-cyan-400",
  MEMBER_STATUS: "bg-cyan-400",
  ROLE_CHANGED: "bg-cyan-400",
};

/** Neutral stand-ins used when the board is set to show numbers without reasons. */
const REDACTED: Record<string, (who: string) => string> = {
  STRIKE_ISSUED:   (w) => `${w} picked up a strike`,
  STRIKE_CLEARED:  (w) => `${w} cleared a strike`,
  STRIKE_EXPIRED:  (w) => `One of ${w}'s strikes aged out`,
  STRIKE_VOIDED:   (w) => `A strike on ${w} was taken back`,
  STRIKE_EXTENDED: (w) => `A timer on ${w}'s strike changed`,
  TASK_SUBMITTED:  (w) => `${w} sent clearing work in for review`,
  TASK_REJECTED:   (w) => `${w}'s clearing work was sent back`,
  APPEAL_OPENED:   (w) => `${w} disputed a strike`,
  APPEAL_DENIED:   (w) => `${w}'s dispute was reviewed — the strike stands`,
};

function redact<T extends { kind: string; summary: string; detail: string | null; member_name: string | null }>(e: T): T {
  const rewrite = REDACTED[e.kind];
  if (!rewrite) return e; // roster and role changes carry no reason to hide
  return { ...e, summary: rewrite(e.member_name ?? "Someone"), detail: null };
}

export default async function FeedPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.must_change_pin) redirect("/me/pin");

  const settings = await getSettings();
  const leader = isLeader(user.role);
  const all = await recentEvents(60);

  // What the feed is allowed to say depends on the board's visibility setting.
  // Private: only entries about you. Numbers-only: everyone's entries, but the
  // reason behind someone else's strike stays between them and the leaders.
  const events = leader
    ? all
    : settings.visibility === "PRIVATE"
      ? all.filter((e) => e.member_id === user.id)
      : settings.visibility === "COUNTS"
        ? all.map((e) => (e.member_id === user.id ? e : redact(e)))
        : all;

  return (
    <Shell user={user} groupName={settings.group_name} active="feed">
      <SectionTitle note="newest first">Everything that's happened</SectionTitle>

      {events.length === 0 ? (
        <Empty title="Nothing yet" note="Strikes, clears, disputes and roster changes all land here." />
      ) : (
        <div className="card divide-y divide-white/5">
          {events.map((e) => (
            <div key={e.id} className="flex gap-3 px-4 py-3">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[e.kind] ?? "bg-slate-600"}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug text-slate-200">{e.summary}</p>
                {e.detail && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{e.detail}</p>}
              </div>
              <span className="shrink-0 text-[0.7rem] text-slate-600">
                <Age since={e.created_at} />
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-slate-600">
        This is the log. Nothing gets changed here without a name attached to it.
        {settings.visibility === "COUNTS" && !leader && " Reasons behind other people's strikes stay between them and the leaders."}
      </p>
    </Shell>
  );
}
