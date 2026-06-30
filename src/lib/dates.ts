// Datohjelpere. Vi normaliserer alle bookingdatoer til midnatt UTC slik at
// sammenligninger blir stabile uavhengig av tidssone. checkOut er eksklusiv.

export function toUtcDate(input: string | Date): Date {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Parser "YYYY-MM-DD" til midnatt UTC. Returnerer null ved ugyldig input. */
export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Formatterer en Date til "YYYY-MM-DD" (UTC). */
export function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Antall netter mellom to datoer (checkOut eksklusiv). */
export function nightsBetween(checkIn: Date, checkOut: Date): number {
  const ms = toUtcDate(checkOut).getTime() - toUtcDate(checkIn).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Sjekker om to halvåpne intervaller [aStart,aEnd) og [bStart,bEnd) overlapper. */
export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function todayUtc(): Date {
  return toUtcDate(new Date());
}
