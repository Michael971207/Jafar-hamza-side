import { prisma } from "@/lib/db";
import { formatNok, formatDateNo } from "@/lib/format";
import { updateInquiryStatusAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin – forespørsler" };

const STATUSES = [
  { key: "new", label: "Ny" },
  { key: "contacted", label: "Kontaktet" },
  { key: "matched", label: "Funnet bolig" },
  { key: "closed", label: "Avsluttet" },
];

export default async function AdminInquiries() {
  const inquiries = await prisma.inquiry.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Forespørsler (midt-/langtid)</h1>

      {inquiries.length === 0 ? (
        <div className="card p-10 text-center text-ink-muted">Ingen forespørsler ennå.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {inquiries.map((i) => (
            <div key={i.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display text-lg font-semibold">{i.name}</div>
                  <div className="text-sm text-ink-muted">{i.email}{i.phone ? ` · ${i.phone}` : ""}</div>
                </div>
                <span className="chip">{STATUSES.find((s) => s.key === i.status)?.label ?? i.status}</span>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <dt className="text-ink-muted">Område</dt>
                <dd>{i.area || "—"}</dd>
                <dt className="text-ink-muted">Oppstart</dt>
                <dd>{i.startDate ? formatDateNo(i.startDate) : "—"}</dd>
                <dt className="text-ink-muted">Varighet</dt>
                <dd>{i.durationMonths ? `${i.durationMonths} mnd` : "—"}</dd>
                <dt className="text-ink-muted">Soverom / pers.</dt>
                <dd>{i.bedrooms} / {i.guests}</dd>
                <dt className="text-ink-muted">Maks budsjett</dt>
                <dd>{i.maxBudget ? `${formatNok(i.maxBudget)}/mnd` : "—"}</dd>
              </dl>

              {i.message && (
                <p className="mt-3 whitespace-pre-line rounded-lg bg-sand-dark p-3 text-sm text-ink-soft">
                  {i.message}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs text-ink-muted">Sett status:</span>
                {STATUSES.map((s) => (
                  <form key={s.key} action={updateInquiryStatusAction}>
                    <input type="hidden" name="id" value={i.id} />
                    <input type="hidden" name="status" value={s.key} />
                    <button
                      className={`rounded-full px-3 py-1 text-xs ${
                        i.status === s.key ? "bg-brand text-white" : "bg-sand-dark text-ink-soft hover:bg-ink/10"
                      }`}
                    >
                      {s.label}
                    </button>
                  </form>
                ))}
                <a href={`mailto:${i.email}`} className="ml-auto text-xs font-medium text-brand hover:underline">
                  Svar på e-post →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
