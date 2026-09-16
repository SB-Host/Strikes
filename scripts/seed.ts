/**
 * Fills a fresh database with a believable group so you can click around
 * before inviting anyone. Safe to skip entirely — the app works empty.
 *
 *   npm run seed
 */
import { createClient } from "@libsql/client";
import { randomUUID, scryptSync, randomBytes } from "node:crypto";

const DAY = 86_400_000;
const now = Date.now();

const hash = (pin: string) => {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(pin, salt, 32).toString("hex")}`;
};

const url = process.env.DATABASE_URL || "file:./strikes.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;
const db = createClient(authToken ? { url, authToken } : { url });

const PEOPLE: [string, string, string, string][] = [
  ["Marcus Hale", "marcus", "LEADER", "sky"],
  ["Tanya Okafor", "tanya", "LEADER", "emerald"],
  ["Devin Cruz", "devin", "MEMBER", "amber"],
  ["Priya Raman", "priya", "MEMBER", "fuchsia"],
  ["Jonah Bell", "jonah", "MEMBER", "orange"],
  ["Sam Whitaker", "sam", "MEMBER", "cyan"],
  ["Elise Navarro", "elise", "MEMBER", "rose"],
  ["Kofi Mensah", "kofi", "MEMBER", "lime"],
];

async function main() {
  const existing = await db.execute("SELECT id FROM members WHERE role = 'OWNER' LIMIT 1");
  if (existing.rows.length === 0) {
    console.error("Start the app once (npm run dev) so the tables and owner get created, then run this.");
    process.exit(1);
  }
  const ownerId = String(existing.rows[0].id);

  const ids = new Map<string, string>();
  for (const [name, handle, role, accent] of PEOPLE) {
    const found = await db.execute({ sql: "SELECT id FROM members WHERE handle = ?", args: [handle] });
    if (found.rows.length) { ids.set(handle, String(found.rows[0].id)); continue; }
    const id = randomUUID();
    ids.set(handle, id);
    await db.execute({
      sql: `INSERT INTO members (id, name, handle, pin_hash, role, status, accent, must_change_pin, created_at)
            VALUES (?,?,?,?,?,'ACTIVE',?,0,?)`,
      args: [id, name, handle, hash("123456"), role, accent, now - 200 * DAY],
    });
  }

  const marcus = ids.get("marcus")!;
  const tanya = ids.get("tanya")!;

  type Row = [string, string, string, string, number, number, number | null, string, string | null, string | null];
  //          handle  reason  category  issuer   weight daysAgo expiresInDays status  task  note
  const STRIKES: Row[] = [
    ["devin", "Late to call time — 25 minutes", "Attendance", marcus, 1, 4, 17, "ACTIVE", null, null],
    ["devin", "Left gear out overnight", "Care", tanya, 1, 11, 3, "ACTIVE", "Run teardown solo once", null],
    ["devin", "Missed the deadline on the flyer", "Follow-through", marcus, 1, 40, null, "EXPIRED", null, null],
    ["priya", "No-show, no message", "Attendance", tanya, 2, 9, 21, "ACTIVE", "Cover a shift for someone else", "Second one this season."],
    ["jonah", "Didn't answer the group chat for three days", "Communication", marcus, 1, 2, 12, "ACTIVE", null, null],
    ["jonah", "Late to call time", "Attendance", tanya, 1, 26, null, "CLEARED", null, null],
    ["sam", "Late to call time", "Attendance", marcus, 1, 55, null, "CLEARED", null, null],
    ["elise", "Disrespect toward a teammate", "Conduct", ownerId, 3, 6, null, "ACTIVE", "Sit down with a leader", "Handled in person too."],
    ["kofi", "Missed deadline", "Follow-through", tanya, 1, 70, null, "EXPIRED", null, null],
    ["kofi", "Gear not put away", "Care", marcus, 1, 33, null, "CLEARED", "Run setup solo once", null],
  ];

  for (const [handle, reason, category, issuer, weight, daysAgo, expiresIn, status, task, note] of STRIKES) {
    const memberId = ids.get(handle)!;
    const dupe = await db.execute({
      sql: "SELECT id FROM strikes WHERE member_id = ? AND reason = ?",
      args: [memberId, reason],
    });
    if (dupe.rows.length) continue;

    const issuedAt = now - daysAgo * DAY;
    const resolved = status === "ACTIVE" ? null : issuedAt + Math.round(daysAgo * 0.6) * DAY;
    await db.execute({
      sql: `INSERT INTO strikes (id, member_id, reason, category, weight, note, task, issued_by, issued_at,
                                 expires_at, status, resolved_at, resolved_by, resolution_note)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        randomUUID(), memberId, reason, category, weight, note, task, issuer, issuedAt,
        expiresIn === null ? null : now + expiresIn * DAY,
        status, resolved, status === "CLEARED" ? issuer : null,
        status === "CLEARED" ? "Did the work, no issues since." : status === "EXPIRED" ? "Aged out automatically" : null,
      ],
    });

    await db.execute({
      sql: "INSERT INTO events (id, kind, actor_id, member_id, summary, created_at) VALUES (?,?,?,?,?,?)",
      args: [randomUUID(), "STRIKE_ISSUED", issuer, memberId, `A strike was logged — ${reason}`, issuedAt],
    });
  }

  console.log("Seeded. Everyone's PIN is 123456 — change them before this touches a real group.");
}

main().catch((e) => { console.error(e); process.exit(1); });
