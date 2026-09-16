"use client";

import { useState } from "react";
import { issueStrikeAction } from "@/app/actions";
import type { Preset } from "@/lib/settings";
import type { Member } from "@/lib/types";
import { ActionForm, Submit } from "./form";
import { Avatar } from "./ui";

/**
 * The thing a leader actually uses, standing in a parking lot on their phone:
 * tap a person, tap a reason, done. Everything else is optional.
 */
export function QuickIssue({
  members, presets, defaultExpiryDays,
}: {
  members: Member[];
  presets: Preset[];
  defaultExpiryDays: number;
}) {
  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [preset, setPreset] = useState<Preset | null>(null);
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("Other");
  const [weight, setWeight] = useState(1);
  const [expiryDays, setExpiryDays] = useState(defaultExpiryDays);
  const [task, setTask] = useState("");
  const [showMore, setShowMore] = useState(false);

  function reset() {
    setMemberId("");
    setPreset(null);
    setReason("");
    setCategory("Other");
    setWeight(1);
    setExpiryDays(defaultExpiryDays);
    setTask("");
    setShowMore(false);
  }

  function applyPreset(p: Preset) {
    setPreset(p);
    setReason(p.label);
    setCategory(p.category);
    setWeight(p.weight);
    setExpiryDays(p.expiryDays);
    setTask(p.task ?? "");
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn btn-primary w-full py-3 text-sm">
        + Give a strike
      </button>
    );
  }

  return (
    <div className="card rise p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Give a strike</h2>
        <button onClick={() => { setOpen(false); reset(); }} className="btn btn-ghost px-2.5 py-1 text-xs">
          Close
        </button>
      </div>

      <ActionForm
        action={issueStrikeAction}
        className="space-y-4"
        resetOnSuccess
        onDone={reset}
      >
        <div>
          <span className="label">Who</span>
          <div className="flex flex-wrap gap-1.5">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMemberId(m.id)}
                className={`flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-xs font-medium transition-colors ${
                  memberId === m.id
                    ? "border-indigo-400/50 bg-indigo-400/15 text-white"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.07]"
                }`}
              >
                <Avatar name={m.name} accent={m.accent} size="sm" />
                {m.name}
              </button>
            ))}
          </div>
          <input type="hidden" name="memberId" value={memberId} />
        </div>

        {presets.length > 0 && (
          <div>
            <span className="label">Common reasons</span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                    preset?.label === p.label
                      ? "border-indigo-400/50 bg-indigo-400/15 text-white"
                      : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.07]"
                  }`}
                >
                  {p.label}
                  <span className="ml-1.5 text-[0.65rem] text-slate-500">
                    {p.weight > 1 ? `×${p.weight}` : ""}{p.expiryDays > 0 ? ` ${p.expiryDays}d` : " no timer"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="label" htmlFor="reason">What happened</label>
          <input
            id="reason" name="reason" className="field" required
            value={reason} onChange={(e) => { setReason(e.target.value); setPreset(null); }}
            placeholder="Say it the way you'd say it out loud"
          />
        </div>

        <input type="hidden" name="category" value={category} />
        <input type="hidden" name="weight" value={weight} />
        <input type="hidden" name="expiryDays" value={expiryDays} />
        <input type="hidden" name="task" value={task} />

        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
        >
          {showMore ? "Hide details" : `Details — ${category} · severity ${weight} · ${expiryDays > 0 ? `${expiryDays}d timer` : "no timer"}${task ? " · has clearing work" : ""}`}
        </button>

        {showMore && (
          <div className="rise grid gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="qi-cat">Category</label>
              <input id="qi-cat" className="field" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="qi-weight">Severity</label>
              <select id="qi-weight" className="field" value={weight} onChange={(e) => setWeight(Number(e.target.value))}>
                <option value={1}>1 — normal</option>
                <option value={2}>2 — serious</option>
                <option value={3}>3 — major</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="qi-exp">Ages out after</label>
              <select id="qi-exp" className="field" value={expiryDays} onChange={(e) => setExpiryDays(Number(e.target.value))}>
                <option value={0}>Never — a leader has to clear it</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={21}>21 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="qi-task">Work to clear it (optional)</label>
              <input
                id="qi-task" className="field" value={task} onChange={(e) => setTask(e.target.value)}
                placeholder="e.g. run setup solo once"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="qi-note">Private note (optional)</label>
              <input id="qi-note" name="note" className="field" placeholder="Context for the other leaders" />
            </div>
          </div>
        )}

        <Submit className="btn btn-primary w-full" pending="Logging…">
          {memberId ? "Log it" : "Pick someone first"}
        </Submit>
      </ActionForm>
    </div>
  );
}
