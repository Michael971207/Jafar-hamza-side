import { InquiryForm } from "@/components/InquiryForm";

export const metadata = { title: "Forespørsel langtidsleie" };

export default function InquiryPage({
  searchParams,
}: {
  searchParams: { apartment?: string };
}) {
  return (
    <div className="container-page max-w-3xl py-12">
      <h1 className="font-display text-4xl font-semibold">Forespør midt- og langtidsleie</h1>
      <p className="mt-3 text-ink-soft">
        Skal du bo i Haugesund-området i alt fra en måned til et helt år? Fortell
        oss hva du ser etter, så finner vi en leilighet som passer – også det som
        ikke ligger ute. Vi tar kontakt med et konkret forslag.
      </p>

      <div className="mt-8">
        <InquiryForm apartmentId={searchParams.apartment} />
      </div>
    </div>
  );
}
