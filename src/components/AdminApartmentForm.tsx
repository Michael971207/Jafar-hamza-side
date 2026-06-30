import type { Apartment } from "@prisma/client";
import { AMENITIES } from "@/lib/amenities";
import { upsertApartmentAction } from "@/app/admin/actions";

function imagesToText(json: string | undefined): string {
  if (!json) return "";
  try {
    const a = JSON.parse(json) as string[];
    return Array.isArray(a) ? a.join("\n") : "";
  } catch {
    return "";
  }
}

function selectedAmenities(json: string | undefined): Set<string> {
  if (!json) return new Set();
  try {
    return new Set(JSON.parse(json) as string[]);
  } catch {
    return new Set();
  }
}

export function AdminApartmentForm({ apartment }: { apartment?: Apartment }) {
  const a = apartment;
  const chosen = selectedAmenities(a?.amenities);

  return (
    <form action={upsertApartmentAction} className="space-y-8">
      {a && <input type="hidden" name="id" value={a.id} />}

      <section className="card space-y-4 p-6">
        <h2 className="font-display text-lg font-semibold">Grunninfo</h2>
        <div>
          <label className="label">Tittel *</label>
          <input name="title" className="input" defaultValue={a?.title} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Slug (URL, valgfritt)</label>
            <input name="slug" className="input" defaultValue={a?.slug} placeholder="genereres automatisk" />
          </div>
          <div>
            <label className="label">Område</label>
            <input name="area" className="input" defaultValue={a?.area} placeholder="Sentrum / Avaldsnes" />
          </div>
        </div>
        <div>
          <label className="label">Kort beskrivelse</label>
          <input name="shortDesc" className="input" defaultValue={a?.shortDesc} />
        </div>
        <div>
          <label className="label">Full beskrivelse</label>
          <textarea name="description" rows={5} className="input" defaultValue={a?.description} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Adresse</label>
            <input name="address" className="input" defaultValue={a?.address} />
          </div>
          <div>
            <label className="label">By</label>
            <input name="city" className="input" defaultValue={a?.city ?? "Haugesund"} />
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="font-display text-lg font-semibold">Egenskaper</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <label className="label">Soverom</label>
            <input name="bedrooms" type="number" min={0} className="input" defaultValue={a?.bedrooms ?? 1} />
          </div>
          <div>
            <label className="label">Bad</label>
            <input name="bathrooms" type="number" min={0} className="input" defaultValue={a?.bathrooms ?? 1} />
          </div>
          <div>
            <label className="label">Maks gjester</label>
            <input name="maxGuests" type="number" min={1} className="input" defaultValue={a?.maxGuests ?? 2} />
          </div>
          <div>
            <label className="label">Størrelse (m²)</label>
            <input name="sizeM2" type="number" min={0} className="input" defaultValue={a?.sizeM2 ?? ""} />
          </div>
        </div>

        <div>
          <label className="label">Fasiliteter</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {AMENITIES.map((am) => (
              <label key={am.key} className="flex items-center gap-2 rounded-lg border border-ink/10 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  name="amenities"
                  value={am.key}
                  defaultChecked={chosen.has(am.key)}
                  className="h-4 w-4 accent-brand"
                />
                <span aria-hidden>{am.icon}</span>
                {am.label}
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="font-display text-lg font-semibold">Pris &amp; regler</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Pris per natt (NOK)</label>
            <input name="nightlyPrice" type="number" min={0} className="input" defaultValue={a?.nightlyPrice ?? 0} />
          </div>
          <div>
            <label className="label">Pris per måned (NOK)</label>
            <input name="monthlyPrice" type="number" min={0} className="input" defaultValue={a?.monthlyPrice ?? ""} />
          </div>
          <div>
            <label className="label">Rengjøringsgebyr (NOK)</label>
            <input name="cleaningFee" type="number" min={0} className="input" defaultValue={a?.cleaningFee ?? 0} />
          </div>
          <div>
            <label className="label">Min. netter</label>
            <input name="minNights" type="number" min={1} className="input" defaultValue={a?.minNights ?? 1} />
          </div>
          <div>
            <label className="label">Maks netter</label>
            <input name="maxNights" type="number" min={1} className="input" defaultValue={a?.maxNights ?? 90} />
          </div>
        </div>
        <div className="flex flex-wrap gap-5 pt-1">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="allowShortTerm" defaultChecked={a ? a.allowShortTerm : true} className="h-4 w-4 accent-brand" />
            Tilby korttidsleie
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="allowLongTerm" defaultChecked={a ? a.allowLongTerm : true} className="h-4 w-4 accent-brand" />
            Tilby langtidsleie
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={a ? a.active : true} className="h-4 w-4 accent-brand" />
            Aktiv (synlig)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="featured" defaultChecked={a ? a.featured : false} className="h-4 w-4 accent-brand" />
            Fremhevet
          </label>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="font-display text-lg font-semibold">Innsjekk</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Innsjekk fra (kl.)</label>
            <input name="checkInTime" className="input" defaultValue={a?.checkInTime ?? "15:00"} placeholder="15:00" />
          </div>
          <div>
            <label className="label">Utsjekk innen (kl.)</label>
            <input name="checkOutTime" className="input" defaultValue={a?.checkOutTime ?? "11:00"} placeholder="11:00" />
          </div>
        </div>
        <div>
          <label className="label">Innsjekk-info (vises til gjest etter at de melder innsjekk)</label>
          <textarea
            name="checkInInfo"
            rows={4}
            className="input"
            defaultValue={a?.checkInInfo ?? ""}
            placeholder="Dørkode: 1234&#10;WiFi: Nettverk / passord&#10;Veibeskrivelse, parkering, husregler …"
          />
        </div>
      </section>

      <section className="card space-y-3 p-6">
        <h2 className="font-display text-lg font-semibold">Bilder</h2>
        <label className="label">Én bilde-URL per linje (første blir hovedbilde)</label>
        <textarea
          name="images"
          rows={4}
          className="input font-mono text-xs"
          defaultValue={imagesToText(a?.images)}
          placeholder="https://…/bilde1.jpg&#10;https://…/bilde2.jpg"
        />
      </section>

      <div className="flex gap-3">
        <button type="submit" className="btn-primary">
          {a ? "Lagre endringer" : "Opprett leilighet"}
        </button>
        <a href="/admin/leiligheter" className="btn-ghost">Avbryt</a>
      </div>
    </form>
  );
}
