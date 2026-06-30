import { AdminApartmentForm } from "@/components/AdminApartmentForm";

export const metadata = { title: "Admin – ny leilighet" };

export default function NewApartmentPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Ny leilighet</h1>
      <AdminApartmentForm />
    </div>
  );
}
