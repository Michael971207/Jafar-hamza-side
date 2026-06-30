"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction } from "@/app/admin/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Logger inn …" : "Logg inn"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(loginAction, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label">Passord</label>
        <input name="password" type="password" className="input" autoFocus required />
      </div>
      {state?.error && (
        <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800">{state.error}</p>
      )}
      <SubmitButton />
    </form>
  );
}
