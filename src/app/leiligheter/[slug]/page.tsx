import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getBusyRanges } from "@/lib/booking";
import { toDateOnly } from "@/lib/dates";
import { amenitiesFromJson } from "@/lib/amenities";
import { formatNok } from "@/lib/format";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { BookingWidget } from "@/components/BookingWidget";

export const dynamic = "force-dynamic";

function images(json: string): string[] {
  try {
    const a = JSON.parse(json);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const apt = await prisma.apartment.findUnique({ where: { slug: params.slug } });
  return { title: apt?.title ?? "Leilighet" };
}

export default async function ApartmentPage({ params }: { params: { slug: string } }) {
  const apt = await prisma.apartment.findUnique({ where: { slug: params.slug } });
  if (!apt || !apt.active) notFound();

  const imgs = images(apt.images);
  const amenities = amenitiesFromJson(apt.amenities);
  const busyRanges = await getBusyRanges(apt.id);
  const busy = busyRanges.map((r) => ({
    start: toDateOnly(r.start),
    end: toDateOnly(r.end),
  }));

  return (
    <div className="container-page py-8">
      <Link href="/leiligheter" className="text-sm text-ink-muted hover:text-ink">
        ← Tilbake til leiligheter
      </Link>

      <h1 className="mt-4 font-display text-3xl font-semibold md:text-4xl">{apt.title}</h1>
      <p className="mt-1 text-ink-soft">
        {apt.area || apt.city} · {apt.bedrooms} soverom · {apt.bathrooms} bad ·{" "}
        {apt.maxGuests} gjester{apt.sizeM2 ? ` · ${apt.sizeM2} m²` : ""}
      </p>

      {/* Galleri */}
      {imgs.length > 0 && (
        <div className="mt-6 grid gap-3 overflow-hidden rounded-2xl md:grid-cols-2">
          <div className="relative aspect-[4/3] md:aspect-auto">
            <Image
              src={imgs[0]}
              alt={apt.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {imgs.slice(1, 5).map((src, i) => (
              <div key={i} className="relative aspect-[4/3]">
                <Image src={src} alt={`${apt.title} bilde ${i + 2}`} fill sizes="25vw" className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        {/* Venstre: info */}
        <div className="space-y-10">
          <section>
            <h2 className="font-display text-2xl font-semibold">Om boligen</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-ink-soft">
              {apt.description || apt.shortDesc}
            </p>
          </section>

          {amenities.length > 0 && (
            <section>
              <h2 className="font-display text-2xl font-semibold">Fasiliteter</h2>
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {amenities.map((a) => (
                  <li key={a.key} className="flex items-center gap-2.5 text-sm text-ink-soft">
                    <span className="text-lg" aria-hidden>{a.icon}</span>
                    {a.label}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="font-display text-2xl font-semibold">Tilgjengelighet</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Synkronisert med Airbnb og Booking.com – det du ser her er reelt ledig.
            </p>
            <div className="card mt-4 p-5">
              <AvailabilityCalendar busy={busy} />
            </div>
          </section>

          {apt.allowLongTerm && (
            <section className="card bg-sand-dark p-6">
              <h2 className="font-display text-xl font-semibold">Ønsker du å bo lenger?</h2>
              <p className="mt-2 text-sm text-ink-soft">
                For opphold på flere måneder kan vi tilby egne betingelser
                {apt.monthlyPrice ? ` (fra ${formatNok(apt.monthlyPrice)}/mnd)` : ""}. Send oss
                en forespørsel med ønsket periode, så tar vi kontakt.
              </p>
              <Link
                href={`/foresporsel?apartment=${apt.id}`}
                className="btn-ghost mt-4"
              >
                Forespør langtidsleie
              </Link>
            </section>
          )}
        </div>

        {/* Høyre: booking */}
        <div>
          {apt.allowShortTerm ? (
            <BookingWidget
              apartmentId={apt.id}
              nightlyPrice={apt.nightlyPrice}
              cleaningFee={apt.cleaningFee}
              minNights={apt.minNights}
              maxNights={apt.maxNights}
              maxGuests={apt.maxGuests}
              busy={busy}
            />
          ) : (
            <div className="card sticky top-20 p-6 text-center">
              <p className="font-semibold">Kun langtidsleie</p>
              <p className="mt-2 text-sm text-ink-soft">
                Denne enheten leies ut for lengre perioder.
              </p>
              <Link href={`/foresporsel?apartment=${apt.id}`} className="btn-primary mt-4 w-full">
                Send forespørsel
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
