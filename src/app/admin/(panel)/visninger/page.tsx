import { prisma } from "@/lib/db";
import { formatDateTimeNo } from "@/lib/format";
import { upsertViewingAction, deleteViewingAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin – visninger" };

export default async function AdminViewings() {
  const [viewings, apartments] = await Promise.all([
    prisma.viewing.findMany({ orderBy: { startsAt: "desc" }, include: { apartment: { select: { title: true } } } }),
    prisma.apartment.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-semibold">Visninger</h1>

      <section className="card p-6">
        <h2 className="font-display text-lg font-semibold">Legg ut ny visning</h2>
        <form action={upsertViewingAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="label">Tittel *</label>
            <input name="title" className="input" required placeholder="Visning: ny 3-roms i Skåredalen" />
          </div>
          <div>
            <label className="label">Starttidspunkt *</label>
            <input name="startsAt" type="datetime-local" className="input" required />
          </div>
          <div>
            <label className="label">Slutt (valgfritt)</label>
            <input name="endsAt" type="datetime-local" className="input" />
          </div>
          <div>
            <label className="label">Adresse</label>
            <input name="address" className="input" />
          </div>
          <div>
            <label className="label">Knytt til leilighet (valgfritt)</label>
            <select name="apartmentId" className="input">
              <option value="">Ingen / ny leilighet</option>
              {apartments.map((a) => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Beskrivelse</label>
            <textarea name="description" rows={3} className="input" />
          </div>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" name="published" defaultChecked className="h-4 w-4 accent-brand" />
            Publiser (synlig på nettsiden)
          </label>
          <div className="md:col-span-2">
            <button className="btn-primary">Legg ut visning</button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Alle visninger</h2>
        {viewings.length === 0 ? (
          <div className="card p-8 text-center text-ink-muted">Ingen visninger.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {viewings.map((v) => (
              <div key={v.id} className="card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold text-brand">{formatDateTimeNo(v.startsAt)}</div>
                    <div className="mt-1 font-display text-lg font-semibold">{v.title}</div>
                  </div>
                  <span className={`chip ${v.published ? "" : "opacity-60"}`}>
                    {v.published ? "Publisert" : "Skjult"}
                  </span>
                </div>
                {v.address && <div className="mt-1 text-sm text-ink-muted">{v.address}</div>}
                {v.apartment && <div className="mt-1 text-xs text-ink-muted">Leilighet: {v.apartment.title}</div>}
                {v.description && <p className="mt-2 whitespace-pre-line text-sm text-ink-soft">{v.description}</p>}
                <form action={deleteViewingAction} className="mt-3">
                  <input type="hidden" name="id" value={v.id} />
                  <button className="text-xs text-red-600 hover:underline">Slett</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
