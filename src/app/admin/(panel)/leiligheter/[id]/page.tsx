import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/business";
import { formatNok } from "@/lib/format";
import { AdminApartmentForm } from "@/components/AdminApartmentForm";
import {
  deleteApartmentAction,
  upsertChannelAction,
  upsertPriceReferenceAction,
} from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const CHANNELS = [
  { key: "airbnb", label: "Airbnb" },
  { key: "booking", label: "Booking.com" },
];

export default async function EditApartmentPage({ params }: { params: { id: string } }) {
  const apartment = await prisma.apartment.findUnique({
    where: { id: params.id },
    include: { channels: true, priceReferences: true },
  });
  if (!apartment) notFound();

  const icalUrl = `${siteUrl()}/api/ical/${apartment.id}.ics`;
  const channelFor = (key: string) => apartment.channels.find((c) => c.channel === key);
  const refFor = (key: string) => apartment.priceReferences.find((p) => p.channel === key);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold">Rediger leilighet</h1>
        <form action={deleteApartmentAction}>
          <input type="hidden" name="id" value={apartment.id} />
          <button className="text-sm text-red-600 hover:underline">Slett</button>
        </form>
      </div>

      <AdminApartmentForm apartment={apartment} />

      {/* Kanalsynk */}
      <section className="card space-y-5 p-6">
        <div>
          <h2 className="font-display text-lg font-semibold">Kanalsynk (mot dobbeltbooking)</h2>
          <p className="mt-1 text-sm text-ink-soft">
            1) Lim inn denne leilighetens eksport-URL i Airbnb og Booking.com slik at de
            ser våre opptatt-datoer. 2) Lim inn deres iCal-URL under, så importerer vi deres
            reservasjoner. Kjør «Synk nå» fra oversikten (eller sett opp cron).
          </p>
        </div>

        <div className="rounded-xl bg-sand-dark p-4">
          <div className="label">Vår eksport-URL (gi til Airbnb &amp; Booking)</div>
          <code className="block break-all rounded-lg bg-white px-3 py-2 text-xs">{icalUrl}</code>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {CHANNELS.map((ch) => {
            const conn = channelFor(ch.key);
            return (
              <form key={ch.key} action={upsertChannelAction} className="rounded-xl border border-ink/10 p-4">
                <input type="hidden" name="apartmentId" value={apartment.id} />
                <input type="hidden" name="channel" value={ch.key} />
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium">{ch.label}</span>
                  {conn?.lastSync && (
                    <span className="text-xs text-ink-muted">
                      synket {new Date(conn.lastSync).toLocaleDateString("nb-NO")}
                    </span>
                  )}
                </div>
                <label className="label">{ch.label} iCal-import-URL</label>
                <input
                  name="icalImportUrl"
                  className="input text-xs"
                  defaultValue={conn?.icalImportUrl ?? ""}
                  placeholder={`https://...${ch.key}.../calendar.ics`}
                />
                <input type="hidden" name="beds24RoomId" value={conn?.beds24RoomId ?? ""} />
                <button className="btn-ghost mt-3 py-1.5">Lagre {ch.label}</button>
              </form>
            );
          })}
        </div>

        {/* Beds24 (valgfri, nær sanntid) */}
        <form action={upsertChannelAction} className="rounded-xl border border-ink/10 p-4">
          <input type="hidden" name="apartmentId" value={apartment.id} />
          <input type="hidden" name="channel" value="beds24" />
          <div className="mb-2 font-medium">Beds24 (valgfri – nær sanntid)</div>
          <label className="label">Beds24 Room ID</label>
          <input
            name="beds24RoomId"
            className="input"
            defaultValue={channelFor("beds24")?.beds24RoomId ?? ""}
            placeholder="f.eks. 123456"
          />
          <input type="hidden" name="icalImportUrl" value={channelFor("beds24")?.icalImportUrl ?? ""} />
          <button className="btn-ghost mt-3 py-1.5">Lagre Beds24</button>
        </form>
      </section>

      {/* Prissammenligning */}
      <section className="card space-y-5 p-6">
        <div>
          <h2 className="font-display text-lg font-semibold">Prissammenligning &amp; gebyrer</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Legg inn prisen gjesten ser på Airbnb/Booking og hvor mange prosent kanalen tar.
            Vi regner ut hva du faktisk sitter igjen med, og hvor lavt du kan prise direkte
            og likevel tjene like mye.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {CHANNELS.map((ch) => {
            const ref = refFor(ch.key);
            const guestPrice = ref?.guestPrice ?? 0;
            const fee = ref?.feePercent ?? 0;
            const net = Math.round(guestPrice * (1 - fee / 100));
            const directSaving = guestPrice - net;
            return (
              <div key={ch.key} className="rounded-xl border border-ink/10 p-4">
                <form action={upsertPriceReferenceAction} className="space-y-3">
                  <input type="hidden" name="apartmentId" value={apartment.id} />
                  <input type="hidden" name="channel" value={ch.key} />
                  <div className="font-medium">{ch.label}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label">Gjestepris/natt</label>
                      <input name="guestPrice" type="number" className="input py-1.5" defaultValue={guestPrice || ""} />
                    </div>
                    <div>
                      <label className="label">Gebyr %</label>
                      <input name="feePercent" type="number" step="0.1" className="input py-1.5" defaultValue={fee || ""} />
                    </div>
                  </div>
                  <input name="note" className="input py-1.5 text-xs" defaultValue={ref?.note ?? ""} placeholder="Notat" />
                  <button className="btn-ghost py-1.5">Lagre</button>
                </form>
                {guestPrice > 0 && (
                  <div className="mt-3 space-y-1 rounded-lg bg-sand-dark p-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Du sitter igjen med</span>
                      <span className="font-semibold">{formatNok(net)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Din pris nå (direkte)</span>
                      <span>{formatNok(apartment.nightlyPrice)}</span>
                    </div>
                    <div className="flex justify-between border-t border-ink/10 pt-1">
                      <span className="text-ink-muted">Kan prises ned til (samme netto)</span>
                      <span className="font-semibold text-brand">{formatNok(net)}</span>
                    </div>
                    <div className="text-ink-muted">
                      → Gjesten sparer inntil {formatNok(directSaving)} ved å booke direkte.
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
