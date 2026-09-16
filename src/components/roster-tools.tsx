"use client";

import { useState } from "react";
import { addMemberAction, resetPinAction, setMemberStatusAction, setRoleAction } from "@/app/actions";
import type { Member } from "@/lib/types";
import { ActionForm, Submit } from "./form";

export function RosterTools({ members, isOwner, selfId }: { members: Member[]; isOwner: boolean; selfId: string }) {
  const [tab, setTab] = useState<"add" | "manage">("add");
  const manageable = members.filter((m) => m.id !== selfId && m.role !== "OWNER");

  return (
    <div className="card p-4">
      <div className="mb-4 flex gap-1 rounded-lg bg-white/[0.03] p-1">
        {(["add", "manage"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === t ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {t === "add" ? "Add a person" : "Manage"}
          </button>
        ))}
      </div>

      {tab === "add" ? (
        <ActionForm action={addMemberAction} className="space-y-3" resetOnSuccess>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="name">Name</label>
              <input id="name" name="name" className="field" placeholder="Jordan Reyes" required />
            </div>
            <div>
              <label className="label" htmlFor="handle">Username (optional)</label>
              <input id="handle" name="handle" className="field" placeholder="left blank, we'll make one" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="role">Role</label>
            <select id="role" name="role" className="field" defaultValue="MEMBER">
              <option value="MEMBER">Member — sees the board, can dispute and clear work</option>
              <option value="LEADER">Leader — can give and clear strikes</option>
            </select>
          </div>
          <Submit className="btn btn-primary w-full" pending="Adding…">Add them</Submit>
          <p className="text-xs text-slate-600">
            You&apos;ll get a one-time PIN to pass along. They pick their own the first time they sign in.
          </p>
        </ActionForm>
      ) : manageable.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-500">Nobody else to manage yet.</p>
      ) : (
        <div className="space-y-4">
          <ActionForm action={resetPinAction} className="space-y-2">
            <label className="label" htmlFor="reset-member">Reset someone&apos;s PIN</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select id="reset-member" name="memberId" className="field sm:flex-1">
                {manageable.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <Submit className="btn btn-ghost">Reset</Submit>
            </div>
          </ActionForm>

          {isOwner && (
            <ActionForm action={setRoleAction} className="space-y-2">
              <label className="label" htmlFor="role-member">Change a role</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select id="role-member" name="memberId" className="field sm:flex-1">
                  {manageable.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} — currently {m.role === "LEADER" ? "leader" : "member"}</option>
                  ))}
                </select>
                <select name="role" className="field sm:w-36" defaultValue="LEADER">
                  <option value="LEADER">Leader</option>
                  <option value="MEMBER">Member</option>
                </select>
                <Submit className="btn btn-ghost">Save</Submit>
              </div>
            </ActionForm>
          )}

          <ActionForm action={setMemberStatusAction} className="space-y-2">
            <label className="label" htmlFor="status-member">Take someone off / put them back</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select id="status-member" name="memberId" className="field sm:flex-1">
                {manageable.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} — currently {m.status === "ACTIVE" ? "on" : "off"}</option>
                ))}
              </select>
              <select name="status" className="field sm:w-36" defaultValue="INACTIVE">
                <option value="INACTIVE">Take off</option>
                <option value="ACTIVE">Put back</option>
              </select>
              <Submit className="btn btn-ghost">Save</Submit>
            </div>
            <p className="text-xs text-slate-600">Taking someone off hides them from the board but keeps their history.</p>
          </ActionForm>
        </div>
      )}
    </div>
  );
}
