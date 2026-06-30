import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/business";
import { formatNok, formatDateNo, formatDateTimeNo } from "@/lib/format";
import { Chat, type ChatMessage } from "@/components/Chat";
import {
  sendHostMessageAction,
  setBookingStatusAction,
  markBookingPaidManualAction,
} from "@/app/admin/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin – booking" };

export default async function AdminBookingDetail({ params }: { params: { id: string } }) {
  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { apartment: true, messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!booking) notFound();

  const guestUrl = booking.accessToken ? `${siteUrl()}/min-booking/${booking.accessToken}` : null;
  const initialMessages: ChatMessage[] = booking.messages.map((m) => ({
    id: m.id,
    sender: m.sender,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <Link href="/admin/bookinger" className="text-sm text-ink-muted hover:text-ink">
        ← Tilbake til bookinger
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold">{booking.guestName}</h1>
        <div className="flex gap-2">
          {booking.status !== "confirmed" && (
            <form action={setBookingStatusAction}>
              <input type="hidden" name="id" value={booking.id} />
              <input type="hidden" name="status" value="confirmed" />
              <button className="btn-primary">Bekreft</button>
            </form>
          )}
          {booking.status !== "cancelled" && (
            <form action={setBookingStatusAction}>
              <input type="hidden" name="id" value={booking.id} />
              <input type="hidden" name="status" value="cancelled" />
              <button className="btn-ghost">Avlys</button>
            </form>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-display text-lg font-semibold">Detaljer</h2>
            <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-ink-muted">Leilighet</dt>
              <dd className="text-right font-medium">{booking.apartment.title}</dd>
              <dt className="text-ink-muted">Status</dt>
              <dd className="text-right font-medium">{booking.status}</dd>
              <dt className="text-ink-muted">Innsjekk</dt>
              <dd className="text-right font-medium">{formatDateNo(booking.checkIn)}</dd>
              <dt className="text-ink-muted">Utsjekk</dt>
              <dd className="text-right font-medium">{formatDateNo(booking.checkOut)}</dd>
              <dt className="text-ink-muted">Netter / gjester</dt>
              <dd className="text-right font-medium">{booking.nights} / {booking.guests}</dd>
              <dt className="text-ink-muted">Totalt</dt>
              <dd className="text-right font-medium">{formatNok(booking.totalPrice)}</dd>
              <dt className="text-ink-muted">E-post</dt>
              <dd className="text-right font-medium">{booking.email}</dd>
              <dt className="text-ink-muted">Telefon</dt>
              <dd className="text-right font-medium">{booking.phone || "—"}</dd>
            </dl>
          </div>

          <div className="card p-6">
            <h2 className="font-display text-lg font-semibold">Betaling</h2>
            <p className="mt-2 text-sm">
              {booking.paymentStatus === "paid" ? (
                <span className="font-medium text-brand">
                  ✓ Betalt{booking.paidAt ? ` ${formatDateNo(booking.paidAt)}` : ""}
                </span>
              ) : (
                <span className="text-ink-muted">Ubetalt ({formatNok(booking.totalPrice)})</span>
              )}
            </p>
            {booking.paymentStatus !== "paid" && booking.status !== "cancelled" && (
              <form action={markBookingPaidManualAction} className="mt-3">
                <input type="hidden" name="id" value={booking.id} />
                <button className="btn-ghost">Marker som betalt (bankoverføring)</button>
              </form>
            )}
          </div>

          <div className="card p-6">
            <h2 className="font-display text-lg font-semibold">Innsjekk</h2>
            <p className="mt-2 text-sm">
              {booking.checkinRequestedAt ? (
                <span className="text-brand">✓ Gjest meldte innsjekk {formatDateTimeNo(booking.checkinRequestedAt)}</span>
              ) : (
                <span className="text-ink-muted">Gjest har ikke meldt innsjekk ennå.</span>
              )}
            </p>
            <p className="mt-3 text-sm text-ink-soft">
              Innsjekk-info (dørkode, WiFi, veibeskrivelse) redigeres på leiligheten:
            </p>
            <Link
              href={`/admin/leiligheter/${booking.apartmentId}`}
              className="mt-2 inline-block text-sm font-medium text-brand hover:underline"
            >
              Rediger innsjekk-info for {booking.apartment.title} →
            </Link>
            {guestUrl && (
              <div className="mt-4 rounded-xl bg-sand-dark p-3">
                <div className="label">Gjestens private bookinglenke</div>
                <code className="block break-all rounded-lg bg-white px-3 py-2 text-xs">{guestUrl}</code>
              </div>
            )}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold">Chat med gjest</h2>
          <div className="mt-4">
            <Chat
              initialMessages={initialMessages}
              meSide="host"
              pollUrl={`/api/admin/booking/${booking.id}/messages`}
              onSend={sendHostMessageAction.bind(null, booking.id)}
              emptyHint="Ingen meldinger ennå."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
