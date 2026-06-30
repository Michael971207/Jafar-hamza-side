import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { business } from "@/lib/business";
import { formatNok, formatDateNo } from "@/lib/format";
import { paymentsEnabled, verifyCheckoutSession } from "@/lib/payments";
import { startPaymentAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Bookingbekreftelse" };

export default async function BookingConfirmation({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { session_id?: string; avbrutt?: string };
}) {
  // Retur fra Stripe Checkout: verifiser betalingen før vi viser status.
  if (searchParams.session_id) {
    try {
      await verifyCheckoutSession(searchParams.session_id);
    } catch (e) {
      console.error("Verifisering av betaling feilet:", e);
    }
  }

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { apartment: true },
  });
  if (!booking) notFound();

  const statusText: Record<string, string> = {
    pending: "Mottatt – venter på bekreftelse",
    confirmed: "Bekreftet",
    cancelled: "Avlyst",
  };
  const isPaid = booking.paymentStatus === "paid";
  const canPayOnline =
    paymentsEnabled() && !isPaid && booking.status !== "cancelled";

  return (
    <div className="container-page max-w-2xl py-12">
      <div className="card p-8">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-brand/10 text-xl">
            {isPaid ? "✓" : "✓"}
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold">
              {isPaid ? "Betalt – takk!" : "Takk for forespørselen!"}
            </h1>
            <p className="text-sm text-ink-muted">
              Status: {isPaid ? "Bekreftet og betalt" : statusText[booking.status] ?? booking.status}
            </p>
          </div>
        </div>

        {searchParams.avbrutt && !isPaid && (
          <p className="mt-4 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">
            Betalingen ble avbrutt. Du kan prøve igjen under, eller betale med bankoverføring.
          </p>
        )}

        <div className="mt-6 space-y-2 rounded-xl bg-sand-dark p-5 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-muted">Leilighet</span>
            <span className="font-medium">{booking.apartment.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Innsjekk</span>
            <span className="font-medium">{formatDateNo(booking.checkIn)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Utsjekk</span>
            <span className="font-medium">{formatDateNo(booking.checkOut)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Netter</span>
            <span className="font-medium">{booking.nights}</span>
          </div>
          <div className="flex justify-between border-t border-ink/10 pt-2 text-base font-semibold">
            <span>Totalt</span>
            <span>{formatNok(booking.totalPrice)}</span>
          </div>
        </div>

        {/* Betaling */}
        {isPaid ? (
          <div className="mt-6 rounded-xl border border-brand/20 bg-brand/5 p-5 text-sm">
            <h2 className="font-semibold text-brand">✓ Betalt</h2>
            <p className="mt-1 text-ink-soft">
              Betalingen er registrert og bookingen er bekreftet. Kvittering er sendt til {booking.email}.
            </p>
          </div>
        ) : (
          <>
            {canPayOnline && (
              <div className="mt-6 rounded-xl border border-brand/20 bg-brand/5 p-5 text-sm">
                <h2 className="font-semibold">Betal nå</h2>
                <p className="mt-1 text-ink-soft">
                  Betal trygt med kort eller Vipps, så bekreftes bookingen umiddelbart.
                </p>
                <form action={startPaymentAction.bind(null, booking.id)} className="mt-3">
                  <button className="btn-primary">Betal {formatNok(booking.totalPrice)}</button>
                </form>
              </div>
            )}

            <div className="mt-6 rounded-xl border border-ink/10 p-5 text-sm">
              <h2 className="font-semibold">{canPayOnline ? "Eller betal med bankoverføring" : "Betaling"}</h2>
              <p className="mt-1 text-ink-soft">
                Vi tar kontakt på {booking.email} for å bekrefte. Betaling kan skje til:
              </p>
              <ul className="mt-3 space-y-1">
                <li><span className="text-ink-muted">Mottaker:</span> {business.name}</li>
                <li><span className="text-ink-muted">Kontonr:</span> {business.accountNr}</li>
                <li><span className="text-ink-muted">Org.nr:</span> {business.orgNr}</li>
                <li><span className="text-ink-muted">Merk betaling:</span> Booking {booking.id.slice(0, 8).toUpperCase()}</li>
              </ul>
            </div>
          </>
        )}

        {booking.accessToken && (
          <div className="mt-6 rounded-xl bg-sand-dark p-5 text-sm">
            <h2 className="font-semibold">Din bookingside</h2>
            <p className="mt-1 text-ink-soft">
              Her kan du melde innsjekk, finne innsjekk-info og chatte direkte med oss.
              Lenken er også sendt på e-post.
            </p>
            <Link href={`/min-booking/${booking.accessToken}`} className="btn-primary mt-3">
              Åpne min booking
            </Link>
          </div>
        )}

        <div className="mt-8 flex gap-3">
          <Link href="/leiligheter" className="btn-ghost">Se flere leiligheter</Link>
          <Link href="/" className="btn-primary">Til forsiden</Link>
        </div>
      </div>
    </div>
  );
}
