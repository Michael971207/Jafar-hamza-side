"use client";

import { useState, useTransition } from "react";
import { runSyncAction } from "@/app/admin/actions";

export function SyncButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      <button
        className="btn-ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const results = await runSyncAction();
            const imported = results.reduce((s, r) => s + r.imported, 0);
            const failed = results.filter((r) => !r.ok).length;
            setMsg(
              `Synket ${results.length} koblinger – ${imported} opptatt-perioder importert` +
                (failed ? `, ${failed} feilet` : ""),
            );
          })
        }
      >
        {pending ? "Synker …" : "Synk Airbnb/Booking nå"}
      </button>
      {msg && <span className="text-sm text-ink-muted">{msg}</span>}
    </div>
  );
}
