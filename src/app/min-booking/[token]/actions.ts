"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  sendCheckinRequestedEmail,
  sendNewMessageEmail,
} from "@/lib/email";

async function bookingByToken(token: string) {
  return prisma.booking.findUnique({
    where: { accessToken: token },
    include: { apartment: true },
  });
}

/** Gjesten melder innsjekk: vi markerer tidspunkt og varsler utleier. */
export async function requestCheckinAction(token: string) {
  const booking = await bookingByToken(token);
  if (!booking) return;

  if (!booking.checkinRequestedAt) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { checkinRequestedAt: new Date() },
    });
    try {
      await sendCheckinRequestedEmail(booking, booking.apartment);
    } catch (e) {
      console.error("E-post (innsjekk meldt) feilet:", e);
    }
  }
  revalidatePath(`/min-booking/${token}`);
}

/** Gjesten sender en melding i chatten. */
export async function sendGuestMessageAction(token: string, body: string) {
  const text = body.trim();
  if (!text) return;
  const booking = await bookingByToken(token);
  if (!booking) return;

  await prisma.message.create({
    data: { bookingId: booking.id, sender: "guest", body: text, readByGuest: true },
  });
  try {
    await sendNewMessageEmail(booking, booking.apartment, "guest", text);
  } catch (e) {
    console.error("E-post (ny melding fra gjest) feilet:", e);
  }
  revalidatePath(`/min-booking/${token}`);
}
