import { prisma } from "@/lib/db";
import { ApartmentCard } from "@/components/ApartmentCard";
import { SearchBar } from "@/components/SearchBar";
import { isAvailable } from "@/lib/booking";
import { parseDateOnly } from "@/lib/dates";

export const dynamic = "force-dynamic";

export const metadata = { title: "Leiligheter" };

type SearchParams = {
  from?: string;
  to?: string;
  guests?: string;
  area?: string;
};

export default async function ListingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const from = parseDateOnly(searchParams.from);
  const to = parseDateOnly(searchParams.to);
  const guests = searchParams.guests ? parseInt(searchParams.guests, 10) : undefined;
  const area = searchParams.area || undefined;

  let apartments = await prisma.apartment.findMany({
    where: {
      active: true,
      area: area ? { equals: area } : undefined,
      maxGuests: guests ? { gte: guests } : undefined,
    },
    orderBy: [{ featured: "desc" }, { nightlyPrice: "asc" }],
  });

  // Filtrer på tilgjengelighet hvis datoer er valgt.
  let datesValid = false;
  if (from && to && to > from) {
    datesValid = true;
    const checks = await Promise.all(
      apartments.map((a) => isAvailable(a.id, from, to)),
    );
    apartments = apartments.filter((_, i) => checks[i]);
  }

  const allAreas = (
    await prisma.apartment.findMany({
      where: { active: true, area: { not: "" } },
      select: { area: true },
      distinct: ["area"],
    })
  ).map((a) => a.area);

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-4xl font-semibold">Leiligheter</h1>
      <p className="mt-2 text-ink-soft">
        Søk på datoer for å se hva som er ledig. Tomt datofelt viser alle enheter.
      </p>

      <div className="mt-6">
        <SearchBar areas={allAreas} />
      </div>

      <div className="mt-4 text-sm text-ink-muted">
        {datesValid
          ? `${apartments.length} ledige enheter for valgt periode`
          : `${apartments.length} enheter`}
      </div>

      {apartments.length === 0 ? (
        <div className="card mt-6 p-10 text-center">
          <p className="text-lg font-semibold">Ingenting ledig for ditt søk</p>
          <p className="mt-2 text-ink-soft">
            Prøv andre datoer, eller{" "}
            <a href="/foresporsel" className="font-semibold text-brand hover:underline">
              send en forespørsel
            </a>{" "}
            så finner vi noe for deg.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {apartments.map((a) => (
            <ApartmentCard key={a.id} apartment={a} />
          ))}
        </div>
      )}
    </div>
  );
}
