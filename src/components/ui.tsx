import Link from "next/link";
import { initials } from "@/lib/util";
import type { Standing } from "@/lib/types";

const ACCENT_BG: Record<string, string> = {
  rose: "bg-rose-500/20 text-rose-200 ring-rose-400/30",
  amber: "bg-amber-500/20 text-amber-200 ring-amber-400/30",
  emerald: "bg-emerald-500/20 text-emerald-200 ring-emerald-400/30",
  sky: "bg-sky-500/20 text-sky-200 ring-sky-400/30",
  violet: "bg-violet-500/20 text-violet-200 ring-violet-400/30",
  cyan: "bg-cyan-500/20 text-cyan-200 ring-cyan-400/30",
  lime: "bg-lime-500/20 text-lime-200 ring-lime-400/30",
  fuchsia: "bg-fuchsia-500/20 text-fuchsia-200 ring-fuchsia-400/30",
  orange: "bg-orange-500/20 text-orange-200 ring-orange-400/30",
  teal: "bg-teal-500/20 text-teal-200 ring-teal-400/30",
  slate: "bg-slate-500/20 text-slate-200 ring-slate-400/30",
};

export function Avatar({ name, accent, size = "md" }: { name: string; accent: string; size?: "sm" | "md" | "lg" }) {
  const dim = size === "sm" ? "h-7 w-7 text-[0.62rem]" : size === "lg" ? "h-14 w-14 text-base" : "h-10 w-10 text-xs";
  return (
    <span
      className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-full font-bold tracking-wide ring-1 ${ACCENT_BG[accent] ?? ACCENT_BG.slate}`}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

const TIER_STYLE: Record<Standing["tier"], { label: string; cls: string }> = {
  CLEAR:    { label: "Clear",    cls: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
  CARRYING: { label: "Carrying", cls: "border-slate-400/25 bg-slate-400/10 text-slate-300" },
  WATCH:   { label: "Watch",    cls: "border-amber-400/30 bg-amber-400/10 text-amber-300" },
  WARNING: { label: "One away",  cls: "border-orange-400/35 bg-orange-400/10 text-orange-300" },
  OVER:    { label: "At the line", cls: "border-rose-400/40 bg-rose-400/10 text-rose-300" },
};

export function TierChip({ tier }: { tier: Standing["tier"] }) {
  const t = TIER_STYLE[tier];
  return <span className={`chip ${t.cls}`}>{t.label}</span>;
}

export function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE:  "border-rose-400/40 bg-rose-400/10 text-rose-300",
    CLEARED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    EXPIRED: "border-sky-400/30 bg-sky-400/10 text-sky-300",
    VOIDED:  "border-white/15 bg-white/5 text-slate-400",
  };
  const label: Record<string, string> = {
    ACTIVE: "Active", CLEARED: "Cleared", EXPIRED: "Aged out", VOIDED: "Taken back",
  };
  return <span className={`chip ${map[status] ?? map.VOIDED}`}>{label[status] ?? status}</span>;
}

/** Severity shown as pips, so a weight-3 strike reads heavier at a glance. */
export function WeightPips({ weight }: { weight: number }) {
  return (
    <span className="inline-flex items-center gap-[3px]" title={`Severity ${weight}`}>
      {Array.from({ length: Math.max(1, weight) }).map((_, i) => (
        <span key={i} className="h-1.5 w-1.5 rounded-full bg-rose-400/80" />
      ))}
    </span>
  );
}

export function Empty({ title, note }: { title: string; note?: string }) {
  return (
    <div className="card px-5 py-10 text-center">
      <p className="text-sm font-semibold text-slate-300">{title}</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  );
}

export function SectionTitle({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-semibold tracking-wide text-slate-200">{children}</h2>
      {note && <span className="text-xs text-slate-500">{note}</span>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="card px-4 py-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-100">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function MemberLink({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <Link href={`/member/${id}`} className="hover:text-white hover:underline underline-offset-4">
      {children}
    </Link>
  );
}
