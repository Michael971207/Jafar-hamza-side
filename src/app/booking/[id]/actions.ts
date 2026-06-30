"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createCheckoutForBooking, stripeEnabled } from "@/lib/payments";

/** Starter Stripe-betaling for en booking og sender gjesten til kassen. */
export async function startPaymentAction(bookingId: string) {
  if (!stripeEnabled()) return;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { apartment: true },
  });
  if (!booking || booking.paymentStatus === "paid" || booking.status === "cancelled") {
    return;
  }

  const { url } = await createCheckoutForBooking(booking, booking.apartment);
  redirect(url); // ekstern redirect til Stripe Checkout
}
