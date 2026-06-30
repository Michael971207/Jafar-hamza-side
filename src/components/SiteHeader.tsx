import Link from "next/link";

const nav = [
  { href: "/leiligheter", label: "Leiligheter" },
  { href: "/foresporsel", label: "Langtidsleie" },
  { href: "/visninger", label: "Visninger" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-sand/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white font-display text-lg">
            J
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            Jafar Utleie
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-sm font-medium text-ink-soft transition hover:text-ink"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/leiligheter" className="btn-primary">
            Book nå
          </Link>
        </div>
      </div>
    </header>
  );
}
