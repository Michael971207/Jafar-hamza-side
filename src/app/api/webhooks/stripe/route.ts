import { NextResponse } from "next/server";
import { verifyStripeSignature, markBookingPaid } from "@/lib/payments";

export const dynamic = "force-dynamic";

// Stripe-webhook: den autoritative bekreftelsen på at en betaling er gjort opp.
// Sett URLen i Stripe-dashbordet og legg signeringshemmeligheten i
// STRIPE_WEBHOOK_SECRET. Vi lytter på checkout.session.completed / async-betalt.

export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!verifyStripeSignature(rawBody, sig)) {
    return NextResponse.json({ error: "Ugyldig signatur" }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data?.object ?? {};
    const bookingId = session.metadata?.bookingId ?? session.client_reference_id;
    if (bookingId && session.payment_status === "paid") {
      await markBookingPaid(bookingId, { provider: "stripe", providerRef: session.id });
    }
  }

  return NextResponse.json({ received: true });
}
