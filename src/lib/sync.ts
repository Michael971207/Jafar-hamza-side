// Synk-motor: importerer eksterne iCal-kalendere (Airbnb/Booking) til
// CalendarBlock-rader. Idempotent via (apartmentId, source, externalUid).

import { prisma } from "@/lib/db";
import { parseIcal } from "@/lib/ical";

const CHANNEL_SOURCE: Record<string, string> = {
  airbnb: "airbnb",
  booking: "booking",
  beds24: "beds24",
};

export type SyncResult = {
  apartmentId: string;
  channel: string;
  imported: number;
  removed: number;
  ok: boolean;
  error?: string;
};

async function fetchIcal(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "JafarUtleie/1.0 (+ical-sync)" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/** Synker én kanal-kobling: henter iCal, oppdaterer blokker. */
export async function syncConnection(connectionId: string): Promise<SyncResult> {
  const conn = await prisma.channelConnection.findUnique({
    where: { id: connectionId },
  });
  if (!conn) {
    return { apartmentId: "", channel: "", imported: 0, removed: 0, ok: false, error: "Kobling ikke funnet" };
  }

  const source = CHANNEL_SOURCE[conn.channel] ?? conn.channel;
  const base = { apartmentId: conn.apartmentId, channel: conn.channel };

  if (!conn.active || !conn.icalImportUrl) {
    return { ...base, imported: 0, removed: 0, ok: true };
  }

  try {
    const text = await fetchIcal(conn.icalImportUrl);
    const events = parseIcal(text);

    // Erstatt alle blokker fra denne kilden med ferske (enkelt og robust).
    const removed = await prisma.calendarBlock.deleteMany({
      where: { apartmentId: conn.apartmentId, source },
    });

    let imported = 0;
    for (const ev of events) {
      if (ev.end <= ev.start) continue;
      await prisma.calendarBlock.create({
        data: {
          apartmentId: conn.apartmentId,
          start: ev.start,
          end: ev.end,
          source,
          reason: ev.summary || `Opptatt (${conn.channel})`,
          externalUid: ev.uid,
        },
      });
      imported++;
    }

    await prisma.channelConnection.update({
      where: { id: conn.id },
      data: { lastSync: new Date() },
    });

    return { ...base, imported, removed: removed.count, ok: true };
  } catch (err) {
    return {
      ...base,
      imported: 0,
      removed: 0,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Synker alle aktive iCal-koblinger. Kjøres av cron / /api/sync/ical. */
export async function syncAll(): Promise<SyncResult[]> {
  const connections = await prisma.channelConnection.findMany({
    where: { active: true, icalImportUrl: { not: null } },
    select: { id: true },
  });
  const results: SyncResult[] = [];
  for (const c of connections) {
    results.push(await syncConnection(c.id));
  }
  return results;
}
