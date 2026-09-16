import { randomUUID } from "node:crypto";

export const now = () => Date.now();
export const newId = () => randomUUID();

export const DAY = 86_400_000;
export const HOUR = 3_600_000;

/** Turns a duration in ms into "3d 4h", "12h", "just now". */
export function humanDuration(ms: number): string {
  if (ms < 60_000) return "just now";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(ms / HOUR);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(ms / DAY);
  const rem = Math.floor((ms % DAY) / HOUR);
  if (days < 14 && rem > 0) return `${days}d ${rem}h`;
  if (days < 60) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
}

export const ACCENTS = [
  "rose", "amber", "emerald", "sky", "violet", "cyan", "lime", "fuchsia", "orange", "teal",
] as const;

export function pickAccent(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
