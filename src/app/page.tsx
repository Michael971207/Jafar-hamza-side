import Link from "next/link";
import { prisma } from "@/lib/db";
import { ApartmentCard } from "@/components/ApartmentCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const featured = await prisma.apartment.findMany({
    where: { active: true },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: 3,
  });

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-dark via-brand to-brand-light" />
        <div className="container-page py-20 text-white md:py-28">
          <p className="mb-4 inline-flex rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
            Haugesund og omegn
          </p>
          <h1 className="max-w-3xl font-display text-4xl font-semibold leading-[1.05] md:text-6xl">
            Bo enkelt – fra én natt til flere måneder
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/85">
            Book leiligheter direkte for korttidsleie, eller send oss en
            forespørsel for midt- og langtidsopphold. Vi finner boligen som
            passer – også når ingen andre kan.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/leiligheter" className="btn-accent">
              Se ledige leiligheter
            </Link>
            <Link href="/foresporsel" className="btn-ghost bg-white/10 text-white ring-0 hover:bg-white/20">
              Forespør langtidsleie
            </Link>
          </div>
        </div>
      </section>

      {/* Midt-term USP */}
      <section className="container-page py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              t: "Midttidsleie er vår styrke",
              d: "Skal du bo i Haugesund i f.eks. 3 måneder? Det finnes nesten ingen som fikser dette på markedet – utenom oss. Fortell oss ønsket ditt, så finner vi leiligheten.",
            },
            {
              t: "Ingen dobbeltbooking",
              d: "Kalenderen er synkronisert på tvers av Airbnb, Booking.com og denne siden. Når en dato blir booket ett sted, stenges den umiddelbart overalt.",
            },
            {
              t: "Direkte og rimeligere",
              d: "Book rett hos oss og slipp plattformgebyrene. Samme leilighet, lavere pris.",
            },
          ].map((c) => (
            <div key={c.t} className="card p-6">
              <h3 className="font-display text-xl font-semibold">{c.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="container-page pb-20">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-display text-3xl font-semibold">Utvalgte leiligheter</h2>
          <Link href="/leiligheter" className="text-sm font-semibold text-brand hover:underline">
            Se alle →
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((a) => (
            <ApartmentCard key={a.id} apartment={a} />
          ))}
        </div>
      </section>

      {/* Long-term CTA */}
      <section className="border-t border-ink/10 bg-sand-dark">
        <div className="container-page grid items-center gap-8 py-16 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-semibold">
              Trenger du bolig i noen måneder?
            </h2>
            <p className="mt-4 text-ink-soft">
              Si fra om periode, antall rom, område og budsjett. «Vil bo utenfor
              byen i 4 måneder» er nok til at vi kan begynne å lete. Vi tar
              kontakt med et forslag.
            </p>
          </div>
          <div className="flex md:justify-end">
            <Link href="/foresporsel" className="btn-primary">
              Send forespørsel
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
