import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Henter meldinger for en booking via gjestens token (token = tilgang).
// Brukes til polling i chatten på "Min booking"-siden.

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const booking = await prisma.booking.findUnique({
    where: { accessToken: params.token },
    select: { id: true },
  });
  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Marker utleiers meldinger som lest av gjest.
  await prisma.message.updateMany({
    where: { bookingId: booking.id, sender: "host", readByGuest: false },
    data: { readByGuest: true },
  });

  const messages = await prisma.message.findMany({
    where: { bookingId: booking.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, sender: true, body: true, createdAt: true },
  });

  return NextResponse.json({ messages });
}
