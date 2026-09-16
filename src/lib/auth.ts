import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { one, run } from "./db";
import { verifyPin } from "./crypto";
import type { Member, Role } from "./types";
import { now } from "./util";

const COOKIE = "strikes_session";
const MAX_AGE = 60 * 60 * 24 * 60; // 60 days — nobody wants to log in every week

function secret(): Uint8Array {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set to a long random string in production.");
    }
    return new TextEncoder().encode("dev-only-insecure-secret-value-0000");
  }
  return new TextEncoder().encode(raw);
}

export async function signIn(handle: string, pin: string): Promise<Member | null> {
  const member = await one<Member & { pin_hash: string }>(
    "SELECT * FROM members WHERE handle = ? AND status = 'ACTIVE'",
    [handle.trim().toLowerCase()],
  );
  if (!member || !verifyPin(pin, member.pin_hash)) return null;

  const token = await new SignJWT({ sub: member.id, role: member.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });

  await run("UPDATE members SET last_seen_at = ? WHERE id = ?", [now(), member.id]);
  return member;
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Returns the logged-in member, or null. Never throws. */
export async function currentUser(): Promise<Member | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const member = await one<Member>(
      "SELECT id, name, handle, role, status, accent, must_change_pin, created_at, last_seen_at FROM members WHERE id = ?",
      [String(payload.sub)],
    );
    if (!member || member.status !== "ACTIVE") return null;
    return member;
  } catch {
    return null;
  }
}

/** Use in pages/actions that must have a user. Throws if signed out. */
export async function requireUser(): Promise<Member> {
  const user = await currentUser();
  if (!user) throw new Error("NOT_AUTHENTICATED");
  return user;
}

export function isLeader(role: Role): boolean {
  return role === "LEADER" || role === "OWNER";
}

export async function requireLeader(): Promise<Member> {
  const user = await requireUser();
  if (!isLeader(user.role)) throw new Error("NOT_AUTHORIZED");
  return user;
}

export async function requireOwner(): Promise<Member> {
  const user = await requireUser();
  if (user.role !== "OWNER") throw new Error("NOT_AUTHORIZED");
  return user;
}
