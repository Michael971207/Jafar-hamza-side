// Online betaling via Stripe Checkout (kort + Vipps – Vipps aktiveres i Stripe-
// dashbordet og dukker da automatisk opp i kassen for NOK).
//
// Bruker Stripe sitt HTTP-API direkte (ingen SDK/npm-avhengighet). Aktiveres ved
// å sette STRIPE_SECRET_KEY. Uten nøkkel er betaling "av", og bookinger betales
// via bankoverføring/faktura (kontonr vises) – flyten fungerer uansett.

import crypto from "crypto";
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/business";
import { closeDatesOnChannels } from "@/lib/channels";
import { sendBookingStatusEmail } from "@/lib/email";
import type { Apartment, Booking } from "@prisma/client";

const STRIPE_API = "https://api.stripe.com/v1";

export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Er online betaling tilgjengelig i det hele tatt? */
export function paymentsEnabled(): boolean {
  return stripeEnabled();
}

function secretKey(): string {
  return process.env.STRIPE_SECRET_KEY as string;
}

/** Bygger application/x-www-form-urlencoded body fra et flatt nøkkel/verdi-objekt. */
function formBody(params: Record<string, string | number>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
}

async function stripePost(path: string, params: Record<string, string | number>) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Stripe ${res.status}: ${data?.error?.message ?? "ukjent feil"}`);
  }
  return data;
}

async function stripeGet(path: string) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Stripe ${res.status}: ${data?.error?.message ?? "ukjent feil"}`);
  }
  return data;
}

/**
 * Oppretter en Stripe Checkout-sesjon for en booking og returnerer URL gjesten
 * skal sendes til. Lager også en Payment-rad (status "created").
 */
export async function createCheckoutForBooking(
  booking: Booking,
  apartment: Apartment,
): Promise<{ url: string }> {
  if (!stripeEnabled()) throw new Error("Stripe er ikke konfigurert.");

  const base = siteUrl();
  const session = await stripePost("/checkout/sessions", {
    mode: "payment",
    // payment_method_types utelates → Stripe viser metodene du har aktivert
    // i dashbordet (kort, Vipps, …) automatisk for NOK.
    "line_items[0][quantity]": 1,
    "line_items[0][price_data][currency]": "nok",
    "line_items[0][price_data][unit_amount]": Math.round(booking.totalPrice * 100),
    "line_items[0][price_data][product_data][name]": `${apartment.title} (${booking.nights} netter)`,
    customer_email: booking.email,
    client_reference_id: booking.id,
    "metadata[bookingId]": booking.id,
    success_url: `${base}/booking/${booking.id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/booking/${booking.id}?avbrutt=1`,
  });

  await prisma.payment.create({
    data: {
      bookingId: booking.id,
      provider: "stripe",
      amount: booking.totalPrice,
      currency: "NOK",
      status: "created",
      providerRef: session.id,
    },
  });

  return { url: session.url as string };
}

/**
 * Markerer en booking som betalt + bekreftet (idempotent). Kalles fra retur-
 * siden og fra webhooket. Sender bekreftelses-e-post første gang.
 */
export async function markBookingPaid(
  bookingId: string,
  opts: { provider?: string; providerRef?: string | null } = {},
): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { apartment: true },
  });
  if (!booking) return;

  // Oppdater/markér Payment-raden.
  if (opts.providerRef) {
    await prisma.payment.updateMany({
      where: { bookingId, providerRef: opts.providerRef },
      data: { status: "paid" },
    });
  }

  if (booking.paymentStatus === "paid") return; // allerede håndtert

  const wasConfirmed = booking.status === "confirmed";
  await prisma.booking.update({
    where: { id: bookingId },
    data: { paymentStatus: "paid", paidAt: new Date(), status: "confirmed" },
  });

  // Steng datoene overalt + send bekreftelse (bare ved første overgang).
  try {
    await closeDatesOnChannels(booking.apartmentId, booking.checkIn, booking.checkOut);
  } catch (e) {
    console.error("closeDatesOnChannels feilet:", e);
  }
  if (!wasConfirmed) {
    try {
      await sendBookingStatusEmail(booking, booking.apartment, "confirmed");
    } catch (e) {
      console.error("Bekreftelses-e-post feilet:", e);
    }
  }
}

/**
 * Henter en Checkout-sesjon og markerer booking betalt hvis den er gjort opp.
 * Brukes på retur-siden (umiddelbar tilbakemelding, uavhengig av webhook).
 */
export async function verifyCheckoutSession(sessionId: string): Promise<boolean> {
  if (!stripeEnabled()) return false;
  const session = await stripeGet(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
  const paid = session.payment_status === "paid";
  if (paid && session.metadata?.bookingId) {
    await markBookingPaid(session.metadata.bookingId, { provider: "stripe", providerRef: session.id });
  }
  return paid;
}

/** Verifiserer Stripe-webhook-signatur (stripe-signature: t=…,v1=…). */
export function verifyStripeSignature(rawBody: string, sigHeader: string | null): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !sigHeader) return false;

  const parts = Object.fromEntries(
    sigHeader.split(",").map((kv) => kv.split("=").map((s) => s.trim()) as [string, string]),
  );
  const timestamp = parts["t"];
  const v1 = parts["v1"];
  if (!timestamp || !v1) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
}
