"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useMemo, useState } from "react";
import { createBookingAction, type BookingFormState } from "@/app/leiligheter/[slug]/actions";
import { formatNok } from "@/lib/format";

type Busy = { start: string; end: string };

function nightsBetween(from: string, to: string): number {
  const a = Date.parse(from);
  const b = Date.parse(to);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86400000);
}

function overlapsBusy(from: string, to: string, busy: Busy[]): boolean {
  return busy.some((b) => from < b.end && b.start < to);
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={disabled || pending}>
      {pending ? "Sender …" : "Send bookingforespørsel"}
    </button>
  );
}

export function BookingWidget({
  apartmentId,
  nightlyPrice,
  cleaningFee,
  minNights,
  maxNights,
  maxGuests,
  busy,
}: {
  apartmentId: string;
  nightlyPrice: number;
  cleaningFee: number;
  minNights: number;
  maxNights: number;
  maxGuests: number;
  busy: Busy[];
}) {
  const [state, formAction] = useFormState<BookingFormState, FormData>(
    createBookingAction,
    undefined,
  );
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const nights = useMemo(() => (from && to ? nightsBetween(from, to) : 0), [from, to]);
  const conflict = useMemo(
    () => (from && to && nights > 0 ? overlapsBusy(from, to, busy) : false),
    [from, to, nights, busy],
  );

  const tooShort = nights > 0 && nights < minNights;
  const tooLong = nights > maxNights;
  const total = nights > 0 ? nights * nightlyPrice + cleaningFee : 0;

  const clientError =
    conflict
      ? "Perioden overlapper med opptatte datoer."
      : tooShort
      ? `Minimum ${minNights} netter.`
      : tooLong
      ? `Maksimum ${maxNights} netter.`
      : null;

  const canSubmit = nights >= minNights && !conflict && !tooLong;

  return (
    <form action={formAction} className="card sticky top-20 space-y-4 p-5">
      <input type="hidden" name="apartmentId" value={apartmentId} />
      <div className="flex items-baseline justify-between">
        <div>
          <span className="font-display text-2xl font-semibold">{formatNok(nightlyPrice)}</span>
          <span className="text-ink-muted"> / natt</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Innsjekk</label>
          <input
            type="date"
            name="from"
            className="input"
            min={today}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Utsjekk</label>
          <input
            type="date"
            name="to"
            className="input"
            min={from || today}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className="label">Gjester</label>
        <input type="number" name="guests" className="input" min={1} max={maxGuests} defaultValue={1} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Navn</label>
          <input name="guestName" className="input" required />
        </div>
        <div>
          <label className="label">Telefon</label>
          <input name="phone" className="input" inputMode="tel" />
        </div>
      </div>
      <div>
        <label className="label">E-post</label>
        <input name="email" type="email" className="input" required />
      </div>
      <div>
        <label className="label">Melding (valgfritt)</label>
        <textarea name="message" rows={2} className="input" />
      </div>

      {nights > 0 && !clientError && (
        <div className="space-y-1 rounded-xl bg-sand-dark p-3 text-sm">
          <div className="flex justify-between">
            <span>{formatNok(nightlyPrice)} × {nights} netter</span>
            <span>{formatNok(nightlyPrice * nights)}</span>
          </div>
          {cleaningFee > 0 && (
            <div className="flex justify-between">
              <span>Rengjøring</span>
              <span>{formatNok(cleaningFee)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-ink/10 pt-1 font-semibold">
            <span>Totalt</span>
            <span>{formatNok(total)}</span>
          </div>
        </div>
      )}

      {clientError && (
        <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">{clientError}</p>
      )}
      {state?.error && (
        <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800">{state.error}</p>
      )}

      <SubmitButton disabled={!canSubmit} />
      <p className="text-center text-xs text-ink-muted">
        Uforpliktende – vi bekrefter og sender betalingsinfo på e-post.
      </p>
    </form>
  );
}
