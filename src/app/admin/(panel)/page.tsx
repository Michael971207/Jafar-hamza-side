import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatNok, formatDateNo } from "@/lib/format";
import { SyncButton } from "@/components/SyncButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin – oversikt" };

export default async function AdminDashboard() {
  const [apartments, activeApartments, pendingBookings, newInquiries, upcomingViewings, recentBookings, recentInquiries] =
    await Promise.all([
      prisma.apartment.count(),
      prisma.apartment.count({ where: { active: true } }),
      prisma.booking.count({ where: { status: "pending" } }),
      prisma.inquiry.count({ where: { status: "new" } }),
      prisma.viewing.count({ where: { startsAt: { gte: new Date() } } }),
      prisma.booking.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { apartment: { select: { title: true } } },
      }),
      prisma.inquiry.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    ]);

  const stats = [
    { label: "Leiligheter (aktive)", value: `${activeApartments}/${apartments}`, href: "/admin/leiligheter" },
    { label: "Ventende bookinger", value: pendingBookings, href: "/admin/bookinger" },
    { label: "Nye forespørsler", value: newInquiries, href: "/admin/foresporsler" },
    { label: "Kommende visninger", value: upcomingViewings, href: "/admin/visninger" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold">Oversikt</h1>
        <SyncButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-5 transition hover:shadow-lg">
            <div className="text-sm text-ink-muted">{s.label}</div>
            <div className="mt-1 font-display text-3xl font-semibold">{s.value}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Siste bookinger</h2>
            <Link href="/admin/bookinger" className="text-sm text-brand hover:underline">Alle →</Link>
          </div>
          <ul className="mt-4 divide-y divide-ink/5">
            {recentBookings.length === 0 && <li className="py-3 text-sm text-ink-muted">Ingen ennå.</li>}
            {recentBookings.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-medium">{b.guestName}</div>
                  <div className="text-ink-muted">
                    {b.apartment.title} · {formatDateNo(b.checkIn)}–{formatDateNo(b.checkOut)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatNok(b.totalPrice)}</div>
                  <span className="text-xs text-ink-muted">{b.status}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Siste forespørsler</h2>
            <Link href="/admin/foresporsler" className="text-sm text-brand hover:underline">Alle →</Link>
          </div>
          <ul className="mt-4 divide-y divide-ink/5">
            {recentInquiries.length === 0 && <li className="py-3 text-sm text-ink-muted">Ingen ennå.</li>}
            {recentInquiries.map((i) => (
              <li key={i.id} className="py-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{i.name}</span>
                  <span className="text-xs text-ink-muted">{i.status}</span>
                </div>
                <div className="text-ink-muted">
                  {i.area || "—"} · {i.durationMonths ? `${i.durationMonths} mnd` : "ukjent varighet"}
                  {i.maxBudget ? ` · maks ${formatNok(i.maxBudget)}/mnd` : ""}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
