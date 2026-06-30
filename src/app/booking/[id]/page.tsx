import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { business } from "@/lib/business";
import { formatNok, formatDateNo } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Bookingbekreftelse" };

export default async function BookingConfirmation({ params }: { params: { id: string } }) {
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

  return (
    <div className="container-page max-w-2xl py-12">
      <div className="card p-8">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-brand/10 text-xl">✓</span>
          <div>
            <h1 className="font-display text-2xl font-semibold">Takk for forespørselen!</h1>
            <p className="text-sm text-ink-muted">
              Status: {statusText[booking.status] ?? booking.status}
            </p>
          </div>
        </div>

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

        <div className="mt-6 rounded-xl border border-brand/20 bg-brand/5 p-5 text-sm">
          <h2 className="font-semibold">Betaling</h2>
          <p className="mt-1 text-ink-soft">
            Vi tar kontakt på {booking.email} for å bekrefte. Betaling skjer til:
          </p>
          <ul className="mt-3 space-y-1">
            <li><span className="text-ink-muted">Mottaker:</span> {business.name}</li>
            <li><span className="text-ink-muted">Kontonr:</span> {business.accountNr}</li>
            <li><span className="text-ink-muted">Org.nr:</span> {business.orgNr}</li>
            <li><span className="text-ink-muted">Merk betaling:</span> Booking {booking.id.slice(0, 8).toUpperCase()}</li>
          </ul>
        </div>

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
