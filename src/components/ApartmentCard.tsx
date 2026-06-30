import Link from "next/link";
import Image from "next/image";
import type { Apartment } from "@prisma/client";
import { formatNok } from "@/lib/format";
import { AmenityList } from "@/components/AmenityList";

function firstImage(json: string): string | null {
  try {
    const arr = JSON.parse(json) as string[];
    return Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
  } catch {
    return null;
  }
}

export function ApartmentCard({ apartment }: { apartment: Apartment }) {
  const img = firstImage(apartment.images);

  return (
    <Link
      href={`/leiligheter/${apartment.slug}`}
      className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-sand-dark">
        {img ? (
          <Image
            src={img}
            alt={apartment.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-ink-muted">Ingen bilde</div>
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          {apartment.allowShortTerm && (
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-brand">
              Korttid
            </span>
          )}
          {apartment.allowLongTerm && (
            <span className="rounded-full bg-brand/90 px-2.5 py-1 text-xs font-semibold text-white">
              Langtid
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold leading-tight">
              {apartment.title}
            </h3>
            <p className="mt-1 text-sm text-ink-muted">
              {apartment.area || apartment.city} · {apartment.bedrooms} soverom ·{" "}
              {apartment.maxGuests} gjester
            </p>
          </div>
        </div>

        <AmenityList json={apartment.amenities} limit={4} />

        <div className="flex items-end justify-between pt-1">
          <div>
            <span className="font-display text-xl font-semibold">
              {formatNok(apartment.nightlyPrice)}
            </span>
            <span className="text-sm text-ink-muted"> / natt</span>
          </div>
          {apartment.monthlyPrice ? (
            <div className="text-right text-xs text-ink-muted">
              {formatNok(apartment.monthlyPrice)} / mnd
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
