import Link from "next/link";

export const metadata = { title: "Takk for forespørselen" };

export default function InquiryThanks() {
  return (
    <div className="container-page max-w-xl py-16 text-center">
      <div className="card p-10">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand/10 text-2xl">
          ✓
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold">Forespørsel sendt!</h1>
        <p className="mt-3 text-ink-soft">
          Takk! Vi har mottatt ønsket ditt og tar kontakt så snart vi har et
          forslag som passer. Sjekk gjerne e-posten din de neste dagene.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/leiligheter" className="btn-ghost">Se ledige leiligheter</Link>
          <Link href="/" className="btn-primary">Til forsiden</Link>
        </div>
      </div>
    </div>
  );
}
