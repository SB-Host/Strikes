"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser, isLeader, requireLeader, requireOwner, requireUser, signIn, signOut } from "@/lib/auth";
import { hashPin, randomPin } from "@/lib/crypto";
import { one, run } from "@/lib/db";
import { getSettings, setSetting } from "@/lib/settings";
import {
  clearStrike, extendStrike, issueStrike, logEvent, openAppeal,
  rejectTask, resolveAppeal, submitTask, voidStrike,
} from "@/lib/strikes";
import { newId, now, pickAccent, slugify } from "@/lib/util";

type Result = { ok: boolean; error?: string; message?: string };

function refresh() {
  revalidatePath("/", "layout");
}

/* ---------------------------------------------------------------- auth */

export async function loginAction(_prev: Result, formData: FormData): Promise<Result> {
  const handle = String(formData.get("handle") ?? "");
  const pin = String(formData.get("pin") ?? "");
  if (!handle || !pin) return { ok: false, error: "Enter your name and PIN." };

  const member = await signIn(handle, pin);
  if (!member) return { ok: false, error: "That name and PIN don't match. Ask a leader to reset it." };

  refresh();
  redirect(member.must_change_pin ? "/me/pin" : isLeader(member.role) ? "/board" : "/me");
}

export async function logoutAction(): Promise<void> {
  await signOut();
  refresh();
  redirect("/login");
}

export async function changePinAction(_prev: Result, formData: FormData): Promise<Result> {
  const user = await requireUser();
  const pin = String(formData.get("pin") ?? "").trim();
  const confirm = String(formData.get("confirm") ?? "").trim();

  if (!/^\d{4,8}$/.test(pin)) return { ok: false, error: "Pick a PIN of 4 to 8 digits." };
  if (pin !== confirm) return { ok: false, error: "The two PINs don't match." };

  await run("UPDATE members SET pin_hash = ?, must_change_pin = 0 WHERE id = ?", [hashPin(pin), user.id]);
  refresh();
  redirect("/me");
}

/* -------------------------------------------------------------- strikes */

export async function issueStrikeAction(_prev: Result, formData: FormData): Promise<Result> {
  const actor = await requireLeader();
  const settings = await getSettings();

  const memberId = String(formData.get("memberId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!memberId || !reason) return { ok: false, error: "Pick a person and say what happened." };

  const target = await one<{ id: string; name: string }>("SELECT id, name FROM members WHERE id = ? AND status = 'ACTIVE'", [memberId]);
  if (!target) return { ok: false, error: "That person isn't on the roster." };

  const weight = Math.min(5, Math.max(1, Number(formData.get("weight") ?? 1) || 1));
  const rawExpiry = formData.get("expiryDays");
  const expiryDays = rawExpiry === null || rawExpiry === "" ? settings.default_expiry_days : Math.max(0, Number(rawExpiry) || 0);

  await issueStrike({
    memberId,
    reason,
    category: String(formData.get("category") ?? "Other") || "Other",
    weight,
    note: String(formData.get("note") ?? "").trim() || null,
    task: String(formData.get("task") ?? "").trim() || null,
    expiryDays,
    actorId: actor.id,
    actorName: actor.name,
  });

  refresh();
  return { ok: true, message: `Strike logged for ${target.name}.` };
}

export async function clearStrikeAction(_prev: Result, formData: FormData): Promise<Result> {
  const actor = await requireLeader();
  await clearStrike(String(formData.get("strikeId") ?? ""), actor, String(formData.get("note") ?? "").trim());
  refresh();
  return { ok: true, message: "Cleared." };
}

export async function voidStrikeAction(_prev: Result, formData: FormData): Promise<Result> {
  const actor = await requireLeader();
  await voidStrike(String(formData.get("strikeId") ?? ""), actor, String(formData.get("note") ?? "").trim());
  refresh();
  return { ok: true, message: "Taken back. It won't count against them." };
}

export async function extendStrikeAction(_prev: Result, formData: FormData): Promise<Result> {
  const actor = await requireLeader();
  await extendStrike(String(formData.get("strikeId") ?? ""), actor, Number(formData.get("days") ?? 0) || 0);
  refresh();
  return { ok: true, message: "Timer updated." };
}

export async function submitTaskAction(_prev: Result, formData: FormData): Promise<Result> {
  const user = await requireUser();
  await submitTask(String(formData.get("strikeId") ?? ""), user, String(formData.get("note") ?? "").trim());
  refresh();
  return { ok: true, message: "Sent to your leaders for a look." };
}

export async function rejectTaskAction(_prev: Result, formData: FormData): Promise<Result> {
  const actor = await requireLeader();
  await rejectTask(String(formData.get("strikeId") ?? ""), actor, String(formData.get("note") ?? "").trim());
  refresh();
  return { ok: true, message: "Sent back." };
}

/* -------------------------------------------------------------- appeals */

export async function openAppealAction(_prev: Result, formData: FormData): Promise<Result> {
  const user = await requireUser();
  const settings = await getSettings();
  if (!settings.allow_appeals) return { ok: false, error: "Disputes are turned off right now." };

  const message = String(formData.get("message") ?? "").trim();
  if (message.length < 10) return { ok: false, error: "Say a bit more about why — at least a sentence." };

  await openAppeal(String(formData.get("strikeId") ?? ""), user, message);
  refresh();
  return { ok: true, message: "Your leaders will see this on their board." };
}

export async function resolveAppealAction(_prev: Result, formData: FormData): Promise<Result> {
  const actor = await requireLeader();
  await resolveAppeal(
    String(formData.get("appealId") ?? ""),
    actor,
    formData.get("decision") === "grant",
    String(formData.get("response") ?? "").trim(),
  );
  refresh();
  return { ok: true, message: "Dispute closed." };
}

/* --------------------------------------------------------------- roster */

export async function addMemberAction(_prev: Result, formData: FormData): Promise<Result> {
  await requireLeader();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { ok: false, error: "Give them a name." };

  const role = String(formData.get("role") ?? "MEMBER");
  if (role === "OWNER") return { ok: false, error: "There can only be one owner." };

  let handle = slugify(String(formData.get("handle") ?? "") || name);
  if (!handle) return { ok: false, error: "That name doesn't work as a username. Add one manually." };

  // Usernames have to be unique; quietly add a number if it's taken.
  let suffix = 1;
  const base = handle;
  while (await one("SELECT id FROM members WHERE handle = ?", [handle])) {
    handle = `${base}${++suffix}`;
    if (suffix > 50) return { ok: false, error: "Couldn't find a free username. Pick one manually." };
  }

  const pin = randomPin();
  await run(
    `INSERT INTO members (id, name, handle, pin_hash, role, status, accent, must_change_pin, created_at)
     VALUES (?,?,?,?,?,'ACTIVE',?,1,?)`,
    [newId(), name, handle, hashPin(pin), role, pickAccent(name), now()],
  );

  const actor = await currentUser();
  await logEvent({ kind: "MEMBER_ADDED", actor_id: actor?.id, summary: `${name} joined the roster` });
  refresh();
  return { ok: true, message: `${name} is in. Username "${handle}", PIN ${pin} — send it to them, they'll pick their own on first login.` };
}

export async function resetPinAction(_prev: Result, formData: FormData): Promise<Result> {
  await requireLeader();
  const memberId = String(formData.get("memberId") ?? "");
  const member = await one<{ name: string; handle: string }>("SELECT name, handle FROM members WHERE id = ?", [memberId]);
  if (!member) return { ok: false, error: "No such person." };

  const pin = randomPin();
  await run("UPDATE members SET pin_hash = ?, must_change_pin = 1 WHERE id = ?", [hashPin(pin), memberId]);
  refresh();
  return { ok: true, message: `New PIN for ${member.name} (username "${member.handle}"): ${pin}` };
}

export async function setRoleAction(_prev: Result, formData: FormData): Promise<Result> {
  const actor = await requireOwner();
  const memberId = String(formData.get("memberId") ?? "");
  const role = String(formData.get("role") ?? "MEMBER");
  if (!["MEMBER", "LEADER"].includes(role)) return { ok: false, error: "Pick member or leader." };
  if (memberId === actor.id) return { ok: false, error: "You can't change your own role." };

  const member = await one<{ name: string; role: string }>("SELECT name, role FROM members WHERE id = ?", [memberId]);
  if (!member) return { ok: false, error: "No such person." };
  if (member.role === "OWNER") return { ok: false, error: "The owner's role is fixed." };

  await run("UPDATE members SET role = ? WHERE id = ?", [role, memberId]);
  await logEvent({
    kind: "ROLE_CHANGED",
    actor_id: actor.id,
    member_id: memberId,
    summary: `${member.name} is now a ${role === "LEADER" ? "leader" : "member"}`,
  });
  refresh();
  return { ok: true, message: `${member.name} is now a ${role === "LEADER" ? "leader" : "member"}.` };
}

export async function setMemberStatusAction(_prev: Result, formData: FormData): Promise<Result> {
  const actor = await requireLeader();
  const memberId = String(formData.get("memberId") ?? "");
  const status = String(formData.get("status") ?? "ACTIVE");
  if (memberId === actor.id) return { ok: false, error: "You can't remove yourself." };

  const member = await one<{ name: string; role: string }>("SELECT name, role FROM members WHERE id = ?", [memberId]);
  if (!member) return { ok: false, error: "No such person." };
  if (member.role === "OWNER") return { ok: false, error: "The owner stays on the roster." };

  await run("UPDATE members SET status = ? WHERE id = ?", [status === "INACTIVE" ? "INACTIVE" : "ACTIVE", memberId]);
  await logEvent({
    kind: "MEMBER_STATUS",
    actor_id: actor.id,
    member_id: memberId,
    summary: `${member.name} was ${status === "INACTIVE" ? "taken off" : "put back on"} the roster`,
  });
  refresh();
  return { ok: true, message: "Roster updated." };
}

/* ------------------------------------------------------------- settings */

export async function saveSettingsAction(_prev: Result, formData: FormData): Promise<Result> {
  await requireOwner();

  const entries: [string, string][] = [
    ["group_name", String(formData.get("group_name") ?? "").trim() || "The Group"],
    ["visibility", String(formData.get("visibility") ?? "FULL")],
    ["default_expiry_days", String(Math.max(0, Number(formData.get("default_expiry_days") ?? 21) || 0))],
    ["threshold_warn", String(Math.max(1, Number(formData.get("threshold_warn") ?? 2) || 1))],
    ["threshold_max", String(Math.max(1, Number(formData.get("threshold_max") ?? 3) || 1))],
    ["consequence", String(formData.get("consequence") ?? "").trim()],
    ["allow_appeals", formData.get("allow_appeals") ? "1" : "0"],
  ];
  for (const [key, value] of entries) await setSetting(key, value);

  refresh();
  return { ok: true, message: "Saved." };
}

export async function savePresetsAction(_prev: Result, formData: FormData): Promise<Result> {
  await requireOwner();
  const raw = String(formData.get("presets") ?? "[]");

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("not a list");
    const clean = parsed.map((p: Record<string, unknown>) => ({
      label: String(p.label ?? "").trim(),
      category: String(p.category ?? "Other").trim() || "Other",
      weight: Math.min(5, Math.max(1, Number(p.weight) || 1)),
      expiryDays: Math.max(0, Number(p.expiryDays) || 0),
      task: String(p.task ?? "").trim() || undefined,
    })).filter((p) => p.label);
    await setSetting("presets", JSON.stringify(clean));
  } catch {
    return { ok: false, error: "Those quick reasons didn't save — check the format and try again." };
  }

  refresh();
  return { ok: true, message: "Quick reasons updated." };
}
