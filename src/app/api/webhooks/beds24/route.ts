import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWebhookSecret, type Beds24Webhook } from "@/lib/beds24";
import { parseDateOnly } from "@/lib/dates";

export const dynamic = "force-dynamic";

// Innkommende webhook fra Beds24: en booking ble gjort (eller avlyst) på
// Airbnb/Booking.com. Vi sperrer/åpner datoene umiddelbart slik at de stenges
// på alle kanaler (inkl. vår egen side). Idempotent via externalUid = bookId.

export async function POST(req: Request) {
  const provided =
    req.headers.get("x-webhook-secret") ??
    new URL(req.url).searchParams.get("secret");

  if (!verifyWebhookSecret(provided)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: Beds24Webhook;
  try {
    payload = (await req.json()) as Beds24Webhook;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const roomId = payload.roomId;
  const bookId = payload.bookId;
  if (!roomId || !bookId) {
    return NextResponse.json({ error: "Mangler roomId/bookId" }, { status: 400 });
  }

  // Finn hvilken leilighet dette Beds24-rommet hører til.
  const connection = await prisma.channelConnection.findFirst({
    where: { channel: "beds24", beds24RoomId: roomId },
  });
  if (!connection) {
    return NextResponse.json({ error: "Ukjent roomId" }, { status: 404 });
  }

  const cancelled = payload.status === "0" || payload.status === "cancelled";
  const externalUid = `beds24:${bookId}`;

  if (cancelled) {
    await prisma.calendarBlock.deleteMany({
      where: { apartmentId: connection.apartmentId, source: "beds24", externalUid },
    });
    return NextResponse.json({ ok: true, action: "cancelled" });
  }

  const start = parseDateOnly(payload.arrival ?? "");
  const end = parseDateOnly(payload.departure ?? "");
  if (!start || !end || end <= start) {
    return NextResponse.json({ error: "Ugyldige datoer" }, { status: 400 });
  }

  // Upsert en blokk (idempotent). Stenger datoene umiddelbart.
  await prisma.calendarBlock.upsert({
    where: {
      apartmentId_source_externalUid: {
        apartmentId: connection.apartmentId,
        source: "beds24",
        externalUid,
      },
    },
    update: { start, end },
    create: {
      apartmentId: connection.apartmentId,
      start,
      end,
      source: "beds24",
      reason: `${payload.channel ?? "kanal"}: ${payload.guestName ?? "reservasjon"}`,
      externalUid,
    },
  });

  return NextResponse.json({ ok: true, action: "blocked" });
}
