"use client";

import { useState } from "react";
import { savePresetsAction, saveSettingsAction } from "@/app/actions";
import type { Preset, Settings } from "@/lib/settings";
import { ActionForm, Submit } from "./form";

const VISIBILITY: { value: Settings["visibility"]; title: string; body: string }[] = [
  {
    value: "FULL",
    title: "Open board",
    body: "Everyone sees everyone — names, counts, reasons, timers. The version that actually stops the texting.",
  },
  {
    value: "COUNTS",
    title: "Numbers only",
    body: "Everyone sees who's carrying what, but the reasons stay between that person and the leaders.",
  },
  {
    value: "PRIVATE",
    title: "Private",
    body: "Each person only sees their own. Leaders still see everything. Quietest, but you'll field more questions.",
  },
];

export function SettingsForm({ settings }: { settings: Settings }) {
  const [presets, setPresets] = useState<Preset[]>(settings.presets);

  function update(i: number, patch: Partial<Preset>) {
    setPresets((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <div className="space-y-6">
      <ActionForm action={saveSettingsAction} className="card space-y-5 p-5">
        <div>
          <label className="label" htmlFor="group_name">Group name</label>
          <input id="group_name" name="group_name" className="field" defaultValue={settings.group_name} />
        </div>

        <div>
          <span className="label">Who sees what</span>
          <div className="space-y-2">
            {VISIBILITY.map((v) => (
              <label
                key={v.value}
                className="flex cursor-pointer gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 transition-colors has-[:checked]:border-indigo-400/40 has-[:checked]:bg-indigo-400/[0.07]"
              >
                <input
                  type="radio" name="visibility" value={v.value}
                  defaultChecked={settings.visibility === v.value}
                  className="mt-1 accent-indigo-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-100">{v.title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{v.body}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="default_expiry_days">Strikes age out after</label>
            <input
              id="default_expiry_days" name="default_expiry_days" type="number" min={0} max={365}
              className="field" defaultValue={settings.default_expiry_days}
            />
            <p className="mt-1 text-[0.68rem] text-slate-600">Days. Use 0 to make strikes stay until a leader clears them.</p>
          </div>
          <div>
            <label className="label" htmlFor="threshold_warn">Watch list starts at</label>
            <input
              id="threshold_warn" name="threshold_warn" type="number" min={1} max={20}
              className="field" defaultValue={settings.threshold_warn}
            />
          </div>
          <div>
            <label className="label" htmlFor="threshold_max">The line is</label>
            <input
              id="threshold_max" name="threshold_max" type="number" min={1} max={20}
              className="field" defaultValue={settings.threshold_max}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="consequence">What happens when someone hits the line</label>
          <input
            id="consequence" name="consequence" className="field" defaultValue={settings.consequence}
            placeholder="Sit-down with a leader and a benched week."
          />
          <p className="mt-1 text-[0.68rem] text-slate-600">
            Everyone sees this on the board. Spelling it out ahead of time saves the argument later.
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <input
            type="checkbox" name="allow_appeals" defaultChecked={settings.allow_appeals}
            className="mt-0.5 accent-indigo-500"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-100">Let people dispute a strike</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
              They write their side once, in the app, and it lands on the leaders&apos; board instead of in your messages.
            </span>
          </span>
        </label>

        <Submit className="btn btn-primary">Save settings</Submit>
      </ActionForm>

      <ActionForm action={savePresetsAction} className="card space-y-4 p-5">
        <div>
          <h3 className="text-sm font-semibold text-white">Quick reasons</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            The buttons your leaders tap instead of typing. Each one carries its own severity, timer and clearing work.
          </p>
        </div>

        <div className="space-y-2">
          {presets.map((p, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 sm:grid-cols-12">
              <input
                className="field sm:col-span-4" value={p.label} placeholder="Reason"
                onChange={(e) => update(i, { label: e.target.value })}
              />
              <input
                className="field sm:col-span-3" value={p.category} placeholder="Category"
                onChange={(e) => update(i, { category: e.target.value })}
              />
              <select
                className="field sm:col-span-2" value={p.weight}
                onChange={(e) => update(i, { weight: Number(e.target.value) })}
              >
                <option value={1}>1 pt</option>
                <option value={2}>2 pts</option>
                <option value={3}>3 pts</option>
              </select>
              <input
                className="field sm:col-span-2" type="number" min={0} value={p.expiryDays}
                onChange={(e) => update(i, { expiryDays: Number(e.target.value) })}
              />
              <button
                type="button"
                onClick={() => setPresets((rows) => rows.filter((_, idx) => idx !== i))}
                className="btn btn-ghost sm:col-span-1"
              >
                ×
              </button>
              <input
                className="field sm:col-span-12" value={p.task ?? "" } placeholder="Work to clear it (optional)"
                onChange={(e) => update(i, { task: e.target.value })}
              />
            </div>
          ))}
        </div>

        <input type="hidden" name="presets" value={JSON.stringify(presets)} />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPresets((rows) => [...rows, { label: "", category: "Other", weight: 1, expiryDays: settings.default_expiry_days }])}
            className="btn btn-ghost"
          >
            + Add one
          </button>
          <Submit className="btn btn-primary">Save quick reasons</Submit>
        </div>
      </ActionForm>
    </div>
  );
}
