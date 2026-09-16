"use client";

import { useEffect, useState } from "react";
import { humanDuration } from "@/lib/util";

/**
 * "Held for 4d 6h", ticking on its own. The server renders a correct first
 * value so there's no flash, then this keeps it honest without a refresh.
 */
export function Age({ since, prefix = "", suffix = "" }: { since: number; prefix?: string; suffix?: string }) {
  const [ms, setMs] = useState(() => Date.now() - since);
  useEffect(() => {
    const tick = () => setMs(Date.now() - since);
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [since]);
  return <span className="tabular-nums">{prefix}{humanDuration(Math.max(0, ms))}{suffix}</span>;
}

/** Counts down to an expiry timestamp. Goes red inside the last two days. */
export function Countdown({ until }: { until: number }) {
  const [ms, setMs] = useState(() => until - Date.now());
  useEffect(() => {
    const tick = () => setMs(until - Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [until]);

  if (ms <= 0) return <span className="text-sky-300">ages out any moment</span>;
  const urgent = ms < 2 * 86_400_000;
  return (
    <span className={`tabular-nums ${urgent ? "text-amber-300" : "text-slate-400"}`}>
      {humanDuration(ms)} left
    </span>
  );
}

export function LocalDate({ ts }: { ts: number }) {
  const [text, setText] = useState("");
  useEffect(() => {
    setText(new Date(ts).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    }));
  }, [ts]);
  return <span suppressHydrationWarning>{text || "—"}</span>;
}
