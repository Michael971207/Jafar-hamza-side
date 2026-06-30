// Minimal, avhengighetsfri iCal-generator og -parser.
// Brukes til toveis synk med Airbnb og Booking.com:
//  - EKSPORT: vi publiserer våre opptatt-datoer som .ics (de importerer den).
//  - IMPORT:  vi henter deres .ics og lagrer opptatt-perioder som CalendarBlock.

import { toUtcDate } from "@/lib/dates";

function formatDate(d: Date): string {
  // VALUE=DATE format: YYYYMMDD
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function fold(line: string): string {
  // iCal anbefaler maks 75 oktetter per linje. Enkel folding.
  if (line.length <= 73) return line;
  const chunks: string[] = [];
  let rest = line;
  chunks.push(rest.slice(0, 73));
  rest = rest.slice(73);
  while (rest.length > 0) {
    chunks.push(" " + rest.slice(0, 72));
    rest = rest.slice(72);
  }
  return chunks.join("\r\n");
}

export type IcalEvent = {
  uid: string;
  start: Date; // inklusiv
  end: Date; // eksklusiv
  summary: string;
};

export function buildIcal(calendarName: string, events: IcalEvent[], stamp: Date): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Jafar Utleie//Booking//NO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:${calendarName}`),
  ];
  const dtstamp = stamp.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  for (const ev of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(fold(`UID:${ev.uid}`));
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART;VALUE=DATE:${formatDate(ev.start)}`);
    lines.push(`DTEND;VALUE=DATE:${formatDate(ev.end)}`);
    lines.push(fold(`SUMMARY:${ev.summary.replace(/\r?\n/g, " ")}`));
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

// ── Parser ───────────────────────────────────────────────────────────────────

function unfold(text: string): string[] {
  const raw = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

function parseIcalDate(value: string): Date | null {
  // Støtter "YYYYMMDD" og "YYYYMMDDTHHMMSSZ"
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (dateOnly) {
    return new Date(Date.UTC(+dateOnly[1], +dateOnly[2] - 1, +dateOnly[3]));
  }
  const dateTime = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/.exec(value);
  if (dateTime) {
    return new Date(
      Date.UTC(+dateTime[1], +dateTime[2] - 1, +dateTime[3], +dateTime[4], +dateTime[5], +dateTime[6]),
    );
  }
  return null;
}

export type ParsedEvent = {
  uid: string;
  start: Date;
  end: Date; // eksklusiv (normalisert til dato)
  summary: string;
};

/** Parser .ics-tekst til en liste opptatt-perioder. Robust nok for Airbnb/Booking. */
export function parseIcal(text: string): ParsedEvent[] {
  const lines = unfold(text);
  const events: ParsedEvent[] = [];
  let current: Partial<{ uid: string; start: Date; end: Date; summary: string }> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (trimmed === "END:VEVENT") {
      if (current?.start && current?.end) {
        events.push({
          uid: current.uid ?? `${formatDate(current.start)}-${formatDate(current.end)}`,
          start: current.start,
          end: current.end,
          summary: current.summary ?? "Opptatt",
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const left = line.slice(0, idx);
    const value = line.slice(idx + 1).trim();
    const name = left.split(";")[0].toUpperCase();

    if (name === "UID") current.uid = value;
    else if (name === "SUMMARY") current.summary = value;
    else if (name === "DTSTART") {
      const d = parseIcalDate(value);
      if (d) current.start = toUtcDate(d);
    } else if (name === "DTEND") {
      const d = parseIcalDate(value);
      if (d) current.end = toUtcDate(d);
    }
  }
  return events;
}
