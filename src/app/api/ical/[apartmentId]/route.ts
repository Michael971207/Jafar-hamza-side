import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getBusyRanges } from "@/lib/booking";
import { buildIcal, type IcalEvent } from "@/lib/ical";

export const dynamic = "force-dynamic";

// iCal-eksport: Airbnb og Booking.com importerer denne URLen for å se hvilke
// datoer som er opptatt hos oss (inkl. reservasjoner fra de andre kanalene).
// URL: /api/ical/<apartmentId>.ics  – settes opp i admin → Kanaler.

export async function GET(
  _req: Request,
  { params }: { params: { apartmentId: string } },
) {
  // Tillat ".ics"-suffiks i URLen.
  const apartmentId = params.apartmentId.replace(/\.ics$/i, "");

  const apartment = await prisma.apartment.findUnique({
    where: { id: apartmentId },
    select: { id: true, title: true },
  });
  if (!apartment) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ranges = await getBusyRanges(apartmentId);
  const events: IcalEvent[] = ranges.map((r, i) => ({
    uid: `${apartmentId}-${i}-${r.start.toISOString().slice(0, 10)}@jafarutleie`,
    start: r.start,
    end: r.end,
    summary: r.source === "direct" ? "Booket (Jafar Utleie)" : `Opptatt (${r.source})`,
  }));

  const body = buildIcal(`Jafar Utleie – ${apartment.title}`, events, new Date());

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${apartmentId}.ics"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
