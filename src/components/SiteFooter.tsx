import Link from "next/link";
import { business } from "@/lib/business";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink/10 bg-ink text-sand">
      <div className="container-page grid gap-10 py-12 md:grid-cols-3">
        <div>
          <div className="font-display text-xl font-semibold">{business.name}</div>
          <p className="mt-3 max-w-xs text-sm text-sand/70">
            Korttids- og midttidsleie i Haugesund og omegn. Direkte booking uten
            mellomledd – og hjelp til å finne bolig for lengre opphold.
          </p>
        </div>

        <div className="text-sm">
          <div className="font-semibold text-sand">Sider</div>
          <ul className="mt-3 space-y-2 text-sand/70">
            <li><Link href="/leiligheter" className="hover:text-sand">Alle leiligheter</Link></li>
            <li><Link href="/foresporsel" className="hover:text-sand">Forespørsel langtidsleie</Link></li>
            <li><Link href="/visninger" className="hover:text-sand">Visninger</Link></li>
            <li><Link href="/admin" className="hover:text-sand">Admin</Link></li>
          </ul>
        </div>

        <div className="text-sm">
          <div className="font-semibold text-sand">Kontakt &amp; betaling</div>
          <ul className="mt-3 space-y-2 text-sand/70">
            <li>{business.address}</li>
            <li>Org.nr: {business.orgNr}</li>
            <li>Kontonr: {business.accountNr}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-sand/10">
        <div className="container-page py-5 text-xs text-sand/50">
          © {new Date().getFullYear()} {business.name}. Alle rettigheter reservert.
        </div>
      </div>
    </footer>
  );
}
