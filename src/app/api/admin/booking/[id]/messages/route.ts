import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isLoggedIn } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Meldinger for admin-chatten. Krever admin-sesjon.

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!isLoggedIn()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Marker gjestens meldinger som lest av utleier.
  await prisma.message.updateMany({
    where: { bookingId: params.id, sender: "guest", readByHost: false },
    data: { readByHost: true },
  });

  const messages = await prisma.message.findMany({
    where: { bookingId: params.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, sender: true, body: true, createdAt: true },
  });

  return NextResponse.json({ messages });
}
