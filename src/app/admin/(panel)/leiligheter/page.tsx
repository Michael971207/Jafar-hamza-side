import Link from "next/link";
import { prisma } from "@/lib/db";
import { QuickPrice } from "@/components/QuickPrice";
import { toggleApartmentActiveAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin – leiligheter" };

export default async function AdminApartments() {
  const apartments = await prisma.apartment.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold">Leiligheter</h1>
        <Link href="/admin/leiligheter/ny" className="btn-primary">+ Ny leilighet</Link>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-sand-dark text-left text-xs uppercase text-ink-muted">
            <tr>
              <th className="px-4 py-3">Leilighet</th>
              <th className="px-4 py-3">Pris (endre direkte)</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {apartments.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3">
                  <Link href={`/admin/leiligheter/${a.id}`} className="font-medium hover:underline">
                    {a.title}
                  </Link>
                  <div className="text-xs text-ink-muted">{a.area || a.city} · {a.bedrooms} sov</div>
                </td>
                <td className="px-4 py-3">
                  <QuickPrice id={a.id} nightlyPrice={a.nightlyPrice} monthlyPrice={a.monthlyPrice} />
                </td>
                <td className="px-4 py-3">
                  <span className={a.active ? "text-brand" : "text-ink-muted"}>
                    {a.active ? "Aktiv" : "Skjult"}
                  </span>
                  {a.featured && <span className="ml-2 chip">Fremhevet</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/leiligheter/${a.slug}`} className="text-xs text-ink-muted hover:text-ink">
                      Vis
                    </Link>
                    <Link href={`/admin/leiligheter/${a.id}`} className="text-xs font-medium text-brand hover:underline">
                      Rediger
                    </Link>
                    <form action={toggleApartmentActiveAction}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="text-xs text-ink-muted hover:text-ink">
                        {a.active ? "Skjul" : "Aktiver"}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
