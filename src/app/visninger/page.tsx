import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDateTimeNo } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Visninger" };

export default async function ViewingsPage() {
  const now = new Date();
  const viewings = await prisma.viewing.findMany({
    where: { published: true, startsAt: { gte: new Date(now.getTime() - 86400000) } },
    orderBy: { startsAt: "asc" },
    include: { apartment: true },
  });

  return (
    <div className="container-page py-12">
      <h1 className="font-display text-4xl font-semibold">Kommende visninger</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Vi legger jevnlig ut nye leiligheter. Her finner du informasjon om
        visninger – kom innom og se standarden før du booker eller leier.
      </p>

      {viewings.length === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <p className="text-lg font-semibold">Ingen visninger akkurat nå</p>
          <p className="mt-2 text-ink-soft">
            Følg med – nye leiligheter kommer fortløpende. I mellomtiden kan du{" "}
            <Link href="/leiligheter" className="font-semibold text-brand hover:underline">
              se det vi har ledig
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {viewings.map((v) => (
            <div key={v.id} className="card p-6">
              <div className="text-sm font-semibold text-brand">
                {formatDateTimeNo(v.startsAt)}
                {v.endsAt ? ` – ${formatDateTimeNo(v.endsAt)}` : ""}
              </div>
              <h2 className="mt-2 font-display text-xl font-semibold">{v.title}</h2>
              {v.address && <p className="mt-1 text-sm text-ink-muted">{v.address}</p>}
              {v.description && (
                <p className="mt-3 whitespace-pre-line text-sm text-ink-soft">{v.description}</p>
              )}
              {v.apartment && (
                <Link
                  href={`/leiligheter/${v.apartment.slug}`}
                  className="mt-4 inline-block text-sm font-semibold text-brand hover:underline"
                >
                  Se leiligheten →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
