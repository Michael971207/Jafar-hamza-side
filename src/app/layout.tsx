import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: {
    default: "Jafar Utleie – Leiligheter i Haugesund",
    template: "%s · Jafar Utleie",
  },
  description:
    "Korttids- og midttidsleie av leiligheter i Haugesund og omegn. Book direkte, " +
    "eller send forespørsel for lengre opphold.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nb">
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
