import { redirect } from "next/navigation";
import Link from "next/link";
import { isLoggedIn } from "@/lib/auth";
import { logoutAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const nav = [
  { href: "/admin", label: "Oversikt" },
  { href: "/admin/leiligheter", label: "Leiligheter" },
  { href: "/admin/bookinger", label: "Bookinger" },
  { href: "/admin/foresporsler", label: "Forespørsler" },
  { href: "/admin/visninger", label: "Visninger" },
];

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) redirect("/admin/login");

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-4">
        <nav className="flex flex-wrap gap-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-full px-3.5 py-1.5 text-sm font-medium text-ink-soft transition hover:bg-white"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-ink-muted hover:text-ink">
            Logg ut
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}
