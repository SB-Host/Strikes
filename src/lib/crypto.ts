import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

/** PINs are short, so they get a per-user salt and a deliberately slow KDF. */
export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(pin.trim(), salt, 32);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;
  try {
    const key = scryptSync(pin.trim(), Buffer.from(saltHex, "hex"), 32);
    return timingSafeEqual(key, Buffer.from(keyHex, "hex"));
  } catch {
    return false;
  }
}

export function randomPin(): string {
  return String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, "0");
}
