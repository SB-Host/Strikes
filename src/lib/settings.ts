import { all, run } from "./db";

export type Visibility = "FULL" | "COUNTS" | "PRIVATE";

export type Preset = {
  label: string;
  category: string;
  weight: number;
  expiryDays: number; // 0 = never expires on its own
  task?: string;
};

export type Settings = {
  group_name: string;
  visibility: Visibility;
  default_expiry_days: number;
  threshold_warn: number;
  threshold_max: number;
  consequence: string;
  allow_appeals: boolean;
  presets: Preset[];
};

const PRESETS: Preset[] = [
  { label: "Late to call time", category: "Attendance", weight: 1, expiryDays: 21 },
  { label: "No-show", category: "Attendance", weight: 2, expiryDays: 30, task: "Cover a shift for someone else" },
  { label: "Missed deadline", category: "Follow-through", weight: 1, expiryDays: 21 },
  { label: "Didn't respond in the group chat", category: "Communication", weight: 1, expiryDays: 14 },
  { label: "Left a mess / gear not put away", category: "Care", weight: 1, expiryDays: 14, task: "Run setup or teardown solo once" },
  { label: "Disrespect toward a teammate", category: "Conduct", weight: 3, expiryDays: 0, task: "Sit down with a leader" },
];

export const DEFAULT_SETTINGS: Record<string, string> = {
  group_name: "The Group",
  visibility: "FULL",
  default_expiry_days: "21",
  threshold_warn: "2",
  threshold_max: "3",
  consequence: "Sit-down with a leader and a benched week.",
  allow_appeals: "1",
  presets: JSON.stringify(PRESETS),
};

export async function getSettings(): Promise<Settings> {
  const rows = await all<{ key: string; value: string }>("SELECT key, value FROM settings");
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const read = (k: string) => map.get(k) ?? DEFAULT_SETTINGS[k];

  let presets: Preset[] = PRESETS;
  try {
    const parsed = JSON.parse(read("presets"));
    if (Array.isArray(parsed)) presets = parsed;
  } catch {
    /* fall back to the built-ins */
  }

  return {
    group_name: read("group_name"),
    visibility: read("visibility") as Visibility,
    default_expiry_days: Number(read("default_expiry_days")),
    threshold_warn: Number(read("threshold_warn")),
    threshold_max: Number(read("threshold_max")),
    consequence: read("consequence"),
    allow_appeals: read("allow_appeals") === "1",
    presets,
  };
}

export async function setSetting(key: string, value: string): Promise<void> {
  await run(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value],
  );
}
