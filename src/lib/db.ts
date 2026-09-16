import { createClient, type Client } from "@libsql/client";
import { SCHEMA } from "./schema";
import { hashPin } from "./crypto";
import { DEFAULT_SETTINGS } from "./settings";
import { newId, now } from "./util";

let client: Client | null = null;
let ready: Promise<void> | null = null;

function connect(): Client {
  if (client) return client;
  const url = process.env.DATABASE_URL || "file:./strikes.db";
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  client = createClient(authToken ? { url, authToken } : { url });
  return client;
}

/**
 * Creates tables, seeds defaults, and makes sure there is exactly one owner
 * account to log in with. Runs at most once per process.
 */
async function migrate(c: Client) {
  for (const stmt of SCHEMA) await c.execute(stmt);

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await c.execute({
      sql: "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
      args: [key, value],
    });
  }

  const owners = await c.execute("SELECT id FROM members WHERE role = 'OWNER' LIMIT 1");
  if (owners.rows.length === 0) {
    const name = process.env.OWNER_NAME || "Owner";
    const handle = (process.env.OWNER_HANDLE || "owner").toLowerCase();
    const pin = process.env.OWNER_PIN || "246810";
    await c.execute({
      sql: `INSERT INTO members (id, name, handle, pin_hash, role, status, accent, must_change_pin, created_at)
            VALUES (?, ?, ?, ?, 'OWNER', 'ACTIVE', 'violet', 0, ?)`,
      args: [newId(), name, handle, hashPin(pin), now()],
    });
  }
}

export async function db(): Promise<Client> {
  const c = connect();
  if (!ready) ready = migrate(c);
  await ready;
  return c;
}

export async function all<T = Record<string, unknown>>(sql: string, args: unknown[] = []): Promise<T[]> {
  const c = await db();
  const res = await c.execute({ sql, args: args as never });
  return res.rows as unknown as T[];
}

export async function one<T = Record<string, unknown>>(sql: string, args: unknown[] = []): Promise<T | null> {
  const rows = await all<T>(sql, args);
  return rows[0] ?? null;
}

export async function run(sql: string, args: unknown[] = []): Promise<void> {
  const c = await db();
  await c.execute({ sql, args: args as never });
}
