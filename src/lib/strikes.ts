import { all, one, run } from "./db";
import { getSettings } from "./settings";
import type { Appeal, GroupEvent, Member, Standing, Strike, StrikeView } from "./types";
import { DAY, newId, now } from "./util";

/* ------------------------------------------------------------------ *
 * Expiry sweep
 * ------------------------------------------------------------------ */

/**
 * Strikes carry their own clock. Rather than run a cron job, we sweep any
 * that have aged out on the way into a read. Cheap, and it means the board
 * is always truthful the moment somebody opens it.
 */
export async function sweepExpired(): Promise<number> {
  const t = now();
  const due = await all<{ id: string; member_id: string; reason: string }>(
    "SELECT id, member_id, reason FROM strikes WHERE status = 'ACTIVE' AND expires_at IS NOT NULL AND expires_at <= ?",
    [t],
  );
  for (const s of due) {
    await run(
      "UPDATE strikes SET status = 'EXPIRED', resolved_at = ?, resolution_note = 'Aged out automatically' WHERE id = ?",
      [t, s.id],
    );
    await logEvent({
      kind: "STRIKE_EXPIRED",
      member_id: s.member_id,
      strike_id: s.id,
      summary: `A strike aged out: ${s.reason}`,
    });
  }
  return due.length;
}

/* ------------------------------------------------------------------ *
 * Event log
 * ------------------------------------------------------------------ */

export async function logEvent(e: {
  kind: string;
  actor_id?: string | null;
  member_id?: string | null;
  strike_id?: string | null;
  summary: string;
  detail?: string | null;
}): Promise<void> {
  await run(
    "INSERT INTO events (id, kind, actor_id, member_id, strike_id, summary, detail, created_at) VALUES (?,?,?,?,?,?,?,?)",
    [newId(), e.kind, e.actor_id ?? null, e.member_id ?? null, e.strike_id ?? null, e.summary, e.detail ?? null, now()],
  );
}

export async function recentEvents(limit = 40): Promise<(GroupEvent & { actor_name: string | null; member_name: string | null })[]> {
  return all(
    `SELECT e.*, a.name AS actor_name, m.name AS member_name
     FROM events e
     LEFT JOIN members a ON a.id = e.actor_id
     LEFT JOIN members m ON m.id = e.member_id
     ORDER BY e.created_at DESC LIMIT ?`,
    [limit],
  );
}

/* ------------------------------------------------------------------ *
 * Reads
 * ------------------------------------------------------------------ */

const STRIKE_SELECT = `
  SELECT s.*,
         m.name   AS member_name,
         m.handle AS member_handle,
         m.accent AS member_accent,
         ib.name  AS issued_by_name,
         rb.name  AS resolved_by_name,
         (SELECT status FROM appeals WHERE strike_id = s.id ORDER BY created_at DESC LIMIT 1) AS appeal_status
  FROM strikes s
  JOIN members m  ON m.id  = s.member_id
  LEFT JOIN members ib ON ib.id = s.issued_by
  LEFT JOIN members rb ON rb.id = s.resolved_by
`;

export async function listStrikes(opts: { memberId?: string; status?: string; limit?: number } = {}): Promise<StrikeView[]> {
  const where: string[] = [];
  const args: unknown[] = [];
  if (opts.memberId) { where.push("s.member_id = ?"); args.push(opts.memberId); }
  if (opts.status)   { where.push("s.status = ?");    args.push(opts.status); }
  const sql = `${STRIKE_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""}
               ORDER BY CASE s.status WHEN 'ACTIVE' THEN 0 ELSE 1 END, s.issued_at DESC
               LIMIT ?`;
  args.push(opts.limit ?? 200);
  return all<StrikeView>(sql, args);
}

export async function getStrike(id: string): Promise<StrikeView | null> {
  return one<StrikeView>(`${STRIKE_SELECT} WHERE s.id = ?`, [id]);
}

export async function listMembers(includeInactive = false): Promise<Member[]> {
  return all<Member>(
    `SELECT id, name, handle, role, status, accent, must_change_pin, created_at, last_seen_at
     FROM members ${includeInactive ? "" : "WHERE status = 'ACTIVE'"}
     ORDER BY name COLLATE NOCASE`,
  );
}

/* ------------------------------------------------------------------ *
 * Standings — the numbers the board is built on
 * ------------------------------------------------------------------ */

export async function standings(): Promise<Standing[]> {
  await sweepExpired();
  const settings = await getSettings();
  const members = await listMembers();

  const agg = await all<{
    member_id: string;
    active: number;
    weight: number;
    lifetime: number;
    cleared: number;
    last_issued: number | null;
    oldest_active: number | null;
    next_expiry: number | null;
    pending_tasks: number;
  }>(
    `SELECT member_id,
            SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END)                      AS active,
            SUM(CASE WHEN status = 'ACTIVE' THEN weight ELSE 0 END)                 AS weight,
            SUM(CASE WHEN status != 'VOIDED' THEN 1 ELSE 0 END)                     AS lifetime,
            SUM(CASE WHEN status = 'CLEARED' THEN 1 ELSE 0 END)                     AS cleared,
            MAX(CASE WHEN status != 'VOIDED' THEN issued_at END)                    AS last_issued,
            MIN(CASE WHEN status = 'ACTIVE' THEN issued_at END)                     AS oldest_active,
            MIN(CASE WHEN status = 'ACTIVE' THEN expires_at END)                    AS next_expiry,
            SUM(CASE WHEN status = 'ACTIVE' AND task_submitted_at IS NOT NULL THEN 1 ELSE 0 END) AS pending_tasks
     FROM strikes GROUP BY member_id`,
  );
  const byMember = new Map(agg.map((a) => [a.member_id, a]));

  return members.map((member) => {
    const a = byMember.get(member.id);
    const active = Number(a?.active ?? 0);
    const weight = Number(a?.weight ?? 0);

    // Order matters: the most serious label that fits, wins.
    let tier: Standing["tier"] = "CLEAR";
    if (weight >= settings.threshold_max) tier = "OVER";
    else if (weight >= settings.threshold_max - 1) tier = "WARNING";
    else if (weight >= settings.threshold_warn) tier = "WATCH";
    else if (weight > 0) tier = "CARRYING";

    return {
      member,
      active,
      weight,
      lifetime: Number(a?.lifetime ?? 0),
      cleared: Number(a?.cleared ?? 0),
      cleanSince: a?.last_issued ?? null,
      oldestActiveAt: a?.oldest_active ?? null,
      nextExpiry: a?.next_expiry ?? null,
      pendingTasks: Number(a?.pending_tasks ?? 0),
      tier,
    };
  });
}

export function sortStandings(rows: Standing[]): Standing[] {
  return [...rows].sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    if (b.active !== a.active) return b.active - a.active;
    return a.member.name.localeCompare(b.member.name);
  });
}

/* ------------------------------------------------------------------ *
 * Writes
 * ------------------------------------------------------------------ */

export async function issueStrike(input: {
  memberId: string;
  reason: string;
  category: string;
  weight: number;
  note?: string | null;
  task?: string | null;
  expiryDays: number;
  actorId: string;
  actorName: string;
}): Promise<string> {
  const id = newId();
  const t = now();
  const expiresAt = input.expiryDays > 0 ? t + input.expiryDays * DAY : null;

  await run(
    `INSERT INTO strikes (id, member_id, reason, category, weight, note, task, issued_by, issued_at, expires_at, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,'ACTIVE')`,
    [id, input.memberId, input.reason, input.category, input.weight,
     input.note || null, input.task || null, input.actorId, t, expiresAt],
  );

  const member = await one<{ name: string }>("SELECT name FROM members WHERE id = ?", [input.memberId]);
  await logEvent({
    kind: "STRIKE_ISSUED",
    actor_id: input.actorId,
    member_id: input.memberId,
    strike_id: id,
    summary: `${input.actorName} gave ${member?.name ?? "someone"} a strike — ${input.reason}`,
    detail: input.task ? `To clear it: ${input.task}` : null,
  });
  return id;
}

export async function clearStrike(strikeId: string, actor: Member, note: string): Promise<void> {
  const strike = await getStrike(strikeId);
  if (!strike || strike.status !== "ACTIVE") return;
  await run(
    "UPDATE strikes SET status = 'CLEARED', resolved_at = ?, resolved_by = ?, resolution_note = ? WHERE id = ?",
    [now(), actor.id, note || "Cleared by a leader", strikeId],
  );
  const held = now() - strike.issued_at;
  await logEvent({
    kind: "STRIKE_CLEARED",
    actor_id: actor.id,
    member_id: strike.member_id,
    strike_id: strikeId,
    summary: `${actor.name} cleared ${strike.member_name}'s strike — ${strike.reason}`,
    detail: `Held for ${Math.max(1, Math.round(held / DAY))} day(s).${note ? ` ${note}` : ""}`,
  });
}

export async function voidStrike(strikeId: string, actor: Member, note: string): Promise<void> {
  const strike = await getStrike(strikeId);
  if (!strike) return;
  await run(
    "UPDATE strikes SET status = 'VOIDED', resolved_at = ?, resolved_by = ?, resolution_note = ? WHERE id = ?",
    [now(), actor.id, note || "Issued in error", strikeId],
  );
  await logEvent({
    kind: "STRIKE_VOIDED",
    actor_id: actor.id,
    member_id: strike.member_id,
    strike_id: strikeId,
    summary: `${actor.name} took back a strike on ${strike.member_name} — ${strike.reason}`,
    detail: note || "Issued in error. It won't count against them.",
  });
}

export async function submitTask(strikeId: string, member: Member, note: string): Promise<void> {
  const strike = await getStrike(strikeId);
  if (!strike || strike.member_id !== member.id || strike.status !== "ACTIVE") return;
  await run("UPDATE strikes SET task_submitted_at = ?, task_submitted_note = ? WHERE id = ?", [now(), note || null, strikeId]);
  await logEvent({
    kind: "TASK_SUBMITTED",
    actor_id: member.id,
    member_id: member.id,
    strike_id: strikeId,
    summary: `${member.name} says the work for "${strike.reason}" is done`,
    detail: note || null,
  });
}

export async function rejectTask(strikeId: string, actor: Member, note: string): Promise<void> {
  const strike = await getStrike(strikeId);
  if (!strike) return;
  await run("UPDATE strikes SET task_submitted_at = NULL, task_submitted_note = ? WHERE id = ?", [note || null, strikeId]);
  await logEvent({
    kind: "TASK_REJECTED",
    actor_id: actor.id,
    member_id: strike.member_id,
    strike_id: strikeId,
    summary: `${actor.name} sent ${strike.member_name}'s clearing work back`,
    detail: note || "Not finished yet.",
  });
}

export async function extendStrike(strikeId: string, actor: Member, days: number): Promise<void> {
  const strike = await getStrike(strikeId);
  if (!strike || strike.status !== "ACTIVE") return;
  const base = strike.expires_at ?? now();
  const next = days === 0 ? null : base + days * DAY;
  await run("UPDATE strikes SET expires_at = ? WHERE id = ?", [next, strikeId]);
  await logEvent({
    kind: "STRIKE_EXTENDED",
    actor_id: actor.id,
    member_id: strike.member_id,
    strike_id: strikeId,
    summary: `${actor.name} ${days === 0 ? "removed the timer on" : `added ${days} day(s) to`} ${strike.member_name}'s strike`,
  });
}

/* ------------------------------------------------------------------ *
 * Appeals
 * ------------------------------------------------------------------ */

export async function openAppeal(strikeId: string, member: Member, message: string): Promise<void> {
  const strike = await getStrike(strikeId);
  if (!strike || strike.member_id !== member.id) return;
  const existing = await one("SELECT id FROM appeals WHERE strike_id = ? AND status = 'OPEN'", [strikeId]);
  if (existing) return;

  await run(
    "INSERT INTO appeals (id, strike_id, member_id, message, status, created_at) VALUES (?,?,?,?,'OPEN',?)",
    [newId(), strikeId, member.id, message, now()],
  );
  await logEvent({
    kind: "APPEAL_OPENED",
    actor_id: member.id,
    member_id: member.id,
    strike_id: strikeId,
    summary: `${member.name} disputed a strike — ${strike.reason}`,
    detail: message,
  });
}

export async function resolveAppeal(appealId: string, actor: Member, grant: boolean, response: string): Promise<void> {
  const appeal = await one<Appeal & { reason: string; member_name: string }>(
    `SELECT a.*, s.reason, m.name AS member_name
     FROM appeals a JOIN strikes s ON s.id = a.strike_id JOIN members m ON m.id = a.member_id
     WHERE a.id = ?`,
    [appealId],
  );
  if (!appeal || appeal.status !== "OPEN") return;

  await run("UPDATE appeals SET status = ?, resolved_at = ?, resolved_by = ?, response = ? WHERE id = ?", [
    grant ? "GRANTED" : "UPHELD", now(), actor.id, response || null, appealId,
  ]);

  if (grant) {
    await voidStrike(appeal.strike_id, actor, response || "Dispute upheld — strike removed.");
  } else {
    await logEvent({
      kind: "APPEAL_DENIED",
      actor_id: actor.id,
      member_id: appeal.member_id,
      strike_id: appeal.strike_id,
      summary: `${actor.name} reviewed ${appeal.member_name}'s dispute — the strike stands`,
      detail: response || null,
    });
  }
}

export async function openAppeals(): Promise<Appeal[]> {
  return all<Appeal>(
    `SELECT a.*, m.name AS member_name, s.reason
     FROM appeals a JOIN members m ON m.id = a.member_id JOIN strikes s ON s.id = a.strike_id
     WHERE a.status = 'OPEN' ORDER BY a.created_at ASC`,
  );
}

/* ------------------------------------------------------------------ *
 * Stats
 * ------------------------------------------------------------------ */

export async function groupStats() {
  await sweepExpired();
  const t = now();
  const byCategory = await all<{ category: string; n: number }>(
    "SELECT category, COUNT(*) AS n FROM strikes WHERE status != 'VOIDED' GROUP BY category ORDER BY n DESC",
  );
  const last30 = await all<{ n: number }>(
    "SELECT COUNT(*) AS n FROM strikes WHERE status != 'VOIDED' AND issued_at >= ?",
    [t - 30 * DAY],
  );
  const prev30 = await all<{ n: number }>(
    "SELECT COUNT(*) AS n FROM strikes WHERE status != 'VOIDED' AND issued_at >= ? AND issued_at < ?",
    [t - 60 * DAY, t - 30 * DAY],
  );
  const clearedTimes = await all<{ held: number }>(
    "SELECT (resolved_at - issued_at) AS held FROM strikes WHERE status = 'CLEARED' AND resolved_at IS NOT NULL",
  );
  const avgHeld = clearedTimes.length
    ? clearedTimes.reduce((sum, r) => sum + Number(r.held), 0) / clearedTimes.length
    : 0;

  // Twelve weekly buckets, oldest first.
  const weeks: { start: number; n: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = t - (i + 1) * 7 * DAY;
    const end = t - i * 7 * DAY;
    const row = await all<{ n: number }>(
      "SELECT COUNT(*) AS n FROM strikes WHERE status != 'VOIDED' AND issued_at >= ? AND issued_at < ?",
      [start, end],
    );
    weeks.push({ start, n: Number(row[0]?.n ?? 0) });
  }

  return {
    byCategory: byCategory.map((r) => ({ category: r.category, n: Number(r.n) })),
    last30: Number(last30[0]?.n ?? 0),
    prev30: Number(prev30[0]?.n ?? 0),
    avgHeldDays: avgHeld / DAY,
    weeks,
  };
}
