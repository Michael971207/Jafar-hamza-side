import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { business } from "@/lib/business";
import { formatNok, formatDateNo } from "@/lib/format";
import { Chat, type ChatMessage } from "@/components/Chat";
import { requestCheckinAction, sendGuestMessageAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Min booking", robots: { index: false } };

function daysUntil(date: Date): number {
  const now = new Date();
  return Math.ceil((date.getTime() - now.getTime()) / 86400000);
}

export default async function MyBookingPage({ params }: { params: { token: string } }) {
  const booking = await prisma.booking.findUnique({
    where: { accessToken: params.token },
    include: { apartment: true, messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!booking) notFound();

  const apt = booking.apartment;
  const statusText: Record<string, string> = {
    pending: "Venter på bekreftelse",
    confirmed: "Bekreftet",
    cancelled: "Avlyst",
  };

  const confirmed = booking.status === "confirmed";
  const revealCheckin =
    confirmed && (booking.checkinRequestedAt !== null || daysUntil(booking.checkIn) <= 2);

  const initialMessages: ChatMessage[] = booking.messages.map((m) => ({
    id: m.id,
    sender: m.sender,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="font-display text-3xl font-semibold">Min booking</h1>
      <p className="mt-1 text-ink-soft">{apt.title}</p>

      {/* Status & detaljer */}
      <div className="card mt-6 p-6">
        <div className="flex items-center justify-between">
          <span className="font-display text-lg font-semibold">Detaljer</span>
          <span
            className={
              confirmed
                ? "chip bg-brand/10 text-brand"
                : booking.status === "cancelled"
                ? "chip text-ink-muted"
                : "chip bg-amber-100 text-amber-800"
            }
          >
            {statusText[booking.status] ?? booking.status}
          </span>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-ink-muted">Innsjekk</dt>
          <dd className="text-right font-medium">{formatDateNo(booking.checkIn)} fra {apt.checkInTime}</dd>
          <dt className="text-ink-muted">Utsjekk</dt>
          <dd className="text-right font-medium">{formatDateNo(booking.checkOut)} innen {apt.checkOutTime}</dd>
          <dt className="text-ink-muted">Netter</dt>
          <dd className="text-right font-medium">{booking.nights}</dd>
          <dt className="text-ink-muted">Totalt</dt>
          <dd className="text-right font-medium">{formatNok(booking.totalPrice)}</dd>
        </dl>
      </div>

      {/* Innsjekk */}
      <div className="card mt-6 p-6">
        <h2 className="font-display text-lg font-semibold">Innsjekk</h2>

        {!confirmed && booking.status !== "cancelled" && (
          <p className="mt-2 text-sm text-ink-soft">
            Når bookingen er bekreftet, finner du innsjekk-info her. Vi gir beskjed på e-post.
          </p>
        )}

        {booking.status === "cancelled" && (
          <p className="mt-2 text-sm text-ink-soft">Denne bookingen er avlyst.</p>
        )}

        {confirmed && !revealCheckin && (
          <div className="mt-3">
            <p className="text-sm text-ink-soft">
              Klar til å sjekke inn? Meld fra, så låser vi opp innsjekk-info (dørkode,
              WiFi og veibeskrivelse) og gir Jafar beskjed.
            </p>
            <form action={requestCheckinAction.bind(null, params.token)} className="mt-4">
              <button className="btn-primary">Meld innsjekk</button>
            </form>
          </div>
        )}

        {confirmed && revealCheckin && (
          <div className="mt-3 space-y-3">
            {booking.checkinRequestedAt && (
              <p className="text-sm text-brand">✓ Innsjekk meldt – velkommen!</p>
            )}
            {apt.checkInInfo ? (
              <div className="whitespace-pre-line rounded-xl bg-sand-dark p-4 text-sm text-ink-soft">
                {apt.checkInInfo}
              </div>
            ) : (
              <p className="text-sm text-ink-soft">
                Vi legger ut innsjekk-detaljene her straks. Bruk chatten under hvis du lurer på noe.
              </p>
            )}
            <p className="text-sm text-ink-muted">
              Adresse: {apt.address || apt.city}. Innsjekk fra {apt.checkInTime}, utsjekk innen {apt.checkOutTime}.
            </p>
          </div>
        )}
      </div>

      {/* Chat */}
      {booking.status !== "cancelled" && (
        <div className="card mt-6 p-6">
          <h2 className="font-display text-lg font-semibold">Chat med {business.name}</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Spørsmål om innsjekk, parkering eller noe annet? Skriv her – vi får varsel.
          </p>
          <div className="mt-4">
            <Chat
              initialMessages={initialMessages}
              meSide="guest"
              pollUrl={`/api/booking/${params.token}/messages`}
              onSend={sendGuestMessageAction.bind(null, params.token)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
