import {
  clearStrikeAction, extendStrikeAction, openAppealAction,
  rejectTaskAction, submitTaskAction, voidStrikeAction,
} from "@/app/actions";
import type { StrikeView } from "@/lib/types";
import { ActionForm, Reveal, Submit } from "./form";
import { Age, Countdown, LocalDate } from "./live";
import { Avatar, MemberLink, StatusChip, WeightPips } from "./ui";

export function StrikeCard({
  strike, viewerRole, viewerId, showMember = true, allowAppeals = true,
}: {
  strike: StrikeView;
  viewerRole: "MEMBER" | "LEADER" | "OWNER";
  viewerId: string;
  showMember?: boolean;
  allowAppeals?: boolean;
}) {
  const isLeader = viewerRole === "LEADER" || viewerRole === "OWNER";
  const isMine = strike.member_id === viewerId;
  const active = strike.status === "ACTIVE";
  const awaitingReview = active && strike.task_submitted_at !== null;

  return (
    <article
      className={`card overflow-hidden ${
        awaitingReview ? "ring-1 ring-amber-400/25" : active ? "" : "opacity-80"
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        {showMember && <Avatar name={strike.member_name} accent={strike.member_accent} />}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {showMember && (
              <MemberLink id={strike.member_id}>
                <span className="text-sm font-semibold text-slate-100">{strike.member_name}</span>
              </MemberLink>
            )}
            <StatusChip status={strike.status} />
            <WeightPips weight={strike.weight} />
            {strike.appeal_status === "OPEN" && (
              <span className="chip border-violet-400/35 bg-violet-400/10 text-violet-300">Disputed</span>
            )}
          </div>

          <p className="mt-1.5 text-[0.95rem] font-medium leading-snug text-white">{strike.reason}</p>

          <p className="mt-1 text-xs text-slate-500">
            <span className="text-slate-400">{strike.category}</span>
            {" · "}
            {strike.issued_by_name ?? "A leader"} on <LocalDate ts={strike.issued_at} />
          </p>

          {strike.note && (
            <p className="mt-2 rounded-lg bg-white/[0.03] px-3 py-2 text-xs leading-relaxed text-slate-400">
              {strike.note}
            </p>
          )}

          {/* The two numbers a spreadsheet never gave you. */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="text-slate-400">
              {active ? <Age since={strike.issued_at} prefix="Held " /> : (
                <>Held <Age since={strike.issued_at} /> before it closed</>
              )}
            </span>
            {active && strike.expires_at && <Countdown until={strike.expires_at} />}
            {active && !strike.expires_at && <span className="text-slate-500">No timer — a leader has to clear it</span>}
          </div>

          {strike.task && (
            <div className="mt-3 rounded-lg border border-indigo-400/20 bg-indigo-400/[0.06] px-3 py-2">
              <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-indigo-300">To clear it</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-300">{strike.task}</p>
              {awaitingReview && (
                <p className="mt-1.5 text-[0.7rem] text-amber-300">
                  Marked done <Age since={strike.task_submitted_at!} suffix=" ago" /> — waiting on a leader
                  {strike.task_submitted_note ? `: "${strike.task_submitted_note}"` : ""}
                </p>
              )}
            </div>
          )}

          {!active && strike.resolution_note && (
            <p className="mt-2 text-xs italic text-slate-500">
              {strike.resolved_by_name ? `${strike.resolved_by_name}: ` : ""}{strike.resolution_note}
            </p>
          )}
        </div>
      </div>

      {(isLeader || isMine) && active && (
        <div className="flex flex-wrap gap-2 border-t border-white/5 bg-white/[0.015] px-4 py-3">
          {isLeader && (
            <>
              <Reveal label={awaitingReview ? "Approve & clear" : "Clear it"} tone="good">
                <ActionForm action={clearStrikeAction} className="flex flex-col gap-2 sm:flex-row">
                  <input type="hidden" name="strikeId" value={strike.id} />
                  <input name="note" className="field sm:flex-1" placeholder="Note (optional) — e.g. showed up early all week" />
                  <Submit className="btn btn-good">Clear</Submit>
                </ActionForm>
              </Reveal>

              {awaitingReview && (
                <Reveal label="Not done yet">
                  <ActionForm action={rejectTaskAction} className="flex flex-col gap-2 sm:flex-row">
                    <input type="hidden" name="strikeId" value={strike.id} />
                    <input name="note" className="field sm:flex-1" placeholder="What's still missing?" />
                    <Submit className="btn btn-ghost">Send back</Submit>
                  </ActionForm>
                </Reveal>
              )}

              <Reveal label="Timer">
                <ActionForm action={extendStrikeAction} className="flex flex-wrap gap-2">
                  <input type="hidden" name="strikeId" value={strike.id} />
                  <select name="days" className="field w-auto" defaultValue="7">
                    <option value="7">+7 days</option>
                    <option value="14">+14 days</option>
                    <option value="30">+30 days</option>
                    <option value="0">Remove the timer</option>
                  </select>
                  <Submit className="btn btn-ghost">Apply</Submit>
                </ActionForm>
              </Reveal>

              <Reveal label="Take it back" tone="warn">
                <ActionForm action={voidStrikeAction} className="flex flex-col gap-2 sm:flex-row">
                  <input type="hidden" name="strikeId" value={strike.id} />
                  <input name="note" className="field sm:flex-1" placeholder="Why — e.g. logged on the wrong person" />
                  <Submit className="btn btn-warn">Take back</Submit>
                </ActionForm>
              </Reveal>
            </>
          )}

          {isMine && strike.task && !awaitingReview && (
            <Reveal label="I did the work" tone="good">
              <ActionForm action={submitTaskAction} className="flex flex-col gap-2 sm:flex-row">
                <input type="hidden" name="strikeId" value={strike.id} />
                <input name="note" className="field sm:flex-1" placeholder="Anything your leader should know" />
                <Submit className="btn btn-good">Send for review</Submit>
              </ActionForm>
            </Reveal>
          )}

          {isMine && allowAppeals && strike.appeal_status !== "OPEN" && (
            <Reveal label="I think this is wrong">
              <ActionForm action={openAppealAction} className="flex flex-col gap-2">
                <input type="hidden" name="strikeId" value={strike.id} />
                <textarea
                  name="message" rows={3} className="field"
                  placeholder="Tell your leaders what actually happened. They'll see this on their board."
                />
                <Submit className="btn btn-ghost self-start">Send it</Submit>
              </ActionForm>
            </Reveal>
          )}
        </div>
      )}
    </article>
  );
}
