import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatNok, formatDateNo } from "@/lib/format";
import {
  setBookingStatusAction,
  createManualBlockAction,
  deleteBlockAction,
} from "@/app/admin/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin – bookinger" };

const STATUS_LABEL: Record<string, string> = {
  pending: "Venter",
  confirmed: "Bekreftet",
  cancelled: "Avlyst",
};

export default async function AdminBookings() {
  const [bookings, blocks, apartments] = await Promise.all([
    prisma.booking.findMany({
      orderBy: { checkIn: "asc" },
      include: { apartment: { select: { title: true } } },
    }),
    prisma.calendarBlock.findMany({
      where: { source: "manual", end: { gte: new Date() } },
      orderBy: { start: "asc" },
      include: { apartment: { select: { title: true } } },
    }),
    prisma.apartment.findMany({ where: { active: true }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);

  // Uleste meldinger fra gjest pr. booking (for indikator).
  const unreadGroups = await prisma.message.groupBy({
    by: ["bookingId"],
    where: { sender: "guest", readByHost: false },
    _count: { _all: true },
  });
  const unread = new Map(unreadGroups.map((g) => [g.bookingId, g._count._all]));

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-semibold">Bookinger</h1>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-sand-dark text-left text-xs uppercase text-ink-muted">
            <tr>
              <th className="px-4 py-3">Gjest</th>
              <th className="px-4 py-3">Leilighet</th>
              <th className="px-4 py-3">Periode</th>
              <th className="px-4 py-3">Kilde</th>
              <th className="px-4 py-3">Sum</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Betaling</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {bookings.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-ink-muted">Ingen bookinger ennå.</td></tr>
            )}
            {bookings.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3">
                  <Link href={`/admin/bookinger/${b.id}`} className="font-medium hover:underline">
                    {b.guestName}
                  </Link>
                  {unread.get(b.id) ? (
                    <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">
                      {unread.get(b.id)} ny{unread.get(b.id) === 1 ? "" : "e"}
                    </span>
                  ) : null}
                  <div className="text-xs text-ink-muted">{b.email}{b.phone ? ` · ${b.phone}` : ""}</div>
                </td>
                <td className="px-4 py-3">{b.apartment.title}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatDateNo(b.checkIn)} – {formatDateNo(b.checkOut)}
                  <div className="text-xs text-ink-muted">{b.nights} netter</div>
                </td>
                <td className="px-4 py-3"><span className="chip">{b.source}</span></td>
                <td className="px-4 py-3 whitespace-nowrap">{formatNok(b.totalPrice)}</td>
                <td className="px-4 py-3">
                  <span className={
                    b.status === "confirmed" ? "text-brand font-medium"
                    : b.status === "cancelled" ? "text-ink-muted line-through"
                    : "text-amber-700 font-medium"
                  }>
                    {STATUS_LABEL[b.status] ?? b.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {b.paymentStatus === "paid" ? (
                    <span className="text-brand font-medium">Betalt</span>
                  ) : b.paymentStatus === "refunded" ? (
                    <span className="text-ink-muted">Refundert</span>
                  ) : (
                    <span className="text-ink-muted">Ubetalt</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link href={`/admin/bookinger/${b.id}`} className="text-xs font-medium text-brand hover:underline">
                      Åpne
                    </Link>
                    {b.status !== "confirmed" && (
                      <form action={setBookingStatusAction}>
                        <input type="hidden" name="id" value={b.id} />
                        <input type="hidden" name="status" value="confirmed" />
                        <button className="text-xs font-medium text-brand hover:underline">Bekreft</button>
                      </form>
                    )}
                    {b.status !== "cancelled" && (
                      <form action={setBookingStatusAction}>
                        <input type="hidden" name="id" value={b.id} />
                        <input type="hidden" name="status" value="cancelled" />
                        <button className="text-xs text-red-600 hover:underline">Avlys</button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Manuell sperring */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold">Sperr datoer manuelt</h2>
          <p className="mt-1 text-sm text-ink-soft">F.eks. eget bruk eller vedlikehold. Stenger på alle kanaler.</p>
          <form action={createManualBlockAction} className="mt-4 space-y-3">
            <div>
              <label className="label">Leilighet</label>
              <select name="apartmentId" className="input" required>
                {apartments.map((a) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Fra</label>
                <input name="start" type="date" className="input" required />
              </div>
              <div>
                <label className="label">Til</label>
                <input name="end" type="date" className="input" required />
              </div>
            </div>
            <div>
              <label className="label">Årsak</label>
              <input name="reason" className="input" placeholder="Vedlikehold" />
            </div>
            <button className="btn-primary">Sperr datoer</button>
          </form>
        </div>

        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold">Aktive manuelle sperringer</h2>
          <ul className="mt-4 divide-y divide-ink/5">
            {blocks.length === 0 && <li className="py-3 text-sm text-ink-muted">Ingen.</li>}
            {blocks.map((bl) => (
              <li key={bl.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-medium">{bl.apartment.title}</div>
                  <div className="text-xs text-ink-muted">
                    {formatDateNo(bl.start)} – {formatDateNo(bl.end)} · {bl.reason}
                  </div>
                </div>
                <form action={deleteBlockAction}>
                  <input type="hidden" name="id" value={bl.id} />
                  <button className="text-xs text-red-600 hover:underline">Fjern</button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
