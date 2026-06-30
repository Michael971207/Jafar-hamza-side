"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function SearchBar({ areas }: { areas: string[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [from, setFrom] = useState(sp.get("from") ?? "");
  const [to, setTo] = useState(sp.get("to") ?? "");
  const [guests, setGuests] = useState(sp.get("guests") ?? "");
  const [area, setArea] = useState(sp.get("area") ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (guests) params.set("guests", guests);
    if (area) params.set("area", area);
    router.push(`/leiligheter?${params.toString()}`);
  }

  return (
    <form
      onSubmit={submit}
      className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
    >
      <div>
        <label className="label">Innsjekk</label>
        <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div>
        <label className="label">Utsjekk</label>
        <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div>
        <label className="label">Gjester</label>
        <input
          type="number"
          min={1}
          className="input"
          placeholder="Alle"
          value={guests}
          onChange={(e) => setGuests(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Område</label>
        <select className="input" value={area} onChange={(e) => setArea(e.target.value)}>
          <option value="">Alle områder</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="btn-primary h-[42px]">
        Søk
      </button>
    </form>
  );
}
