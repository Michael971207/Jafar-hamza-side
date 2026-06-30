"use client";

import { useState, useTransition } from "react";
import { updatePriceAction } from "@/app/admin/actions";

export function QuickPrice({
  id,
  nightlyPrice,
  monthlyPrice,
}: {
  id: string;
  nightlyPrice: number;
  monthlyPrice: number | null;
}) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [night, setNight] = useState(String(nightlyPrice));
  const [month, setMonth] = useState(monthlyPrice ? String(monthlyPrice) : "");

  function save() {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("nightlyPrice", night);
    fd.set("monthlyPrice", month);
    start(async () => {
      await updatePriceAction(fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <input
          className="input w-24 py-1.5"
          value={night}
          inputMode="numeric"
          onChange={(e) => setNight(e.target.value)}
        />
        <span className="text-xs text-ink-muted">/natt</span>
      </div>
      <div className="flex items-center gap-1">
        <input
          className="input w-24 py-1.5"
          value={month}
          inputMode="numeric"
          placeholder="—"
          onChange={(e) => setMonth(e.target.value)}
        />
        <span className="text-xs text-ink-muted">/mnd</span>
      </div>
      <button onClick={save} disabled={pending} className="btn-ghost py-1.5">
        {pending ? "…" : saved ? "Lagret ✓" : "Lagre"}
      </button>
    </div>
  );
}
