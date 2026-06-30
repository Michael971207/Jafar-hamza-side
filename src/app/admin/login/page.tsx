import { redirect } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin – logg inn" };

export default function AdminLoginPage() {
  if (isLoggedIn()) redirect("/admin");
  return (
    <div className="container-page grid min-h-[70vh] place-items-center py-12">
      <div className="card w-full max-w-sm p-8">
        <h1 className="font-display text-2xl font-semibold">Admin</h1>
        <p className="mt-1 text-sm text-ink-muted">Logg inn for å administrere utleien.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
