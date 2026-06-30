"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createInquiryAction, type InquiryState } from "@/app/foresporsel/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Sender …" : "Send forespørsel"}
    </button>
  );
}

export function InquiryForm({ apartmentId }: { apartmentId?: string }) {
  const [state, formAction] = useFormState<InquiryState, FormData>(
    createInquiryAction,
    undefined,
  );

  return (
    <form action={formAction} className="card space-y-5 p-6">
      {apartmentId && <input type="hidden" name="apartmentId" value={apartmentId} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Navn *</label>
          <input name="name" className="input" required />
        </div>
        <div>
          <label className="label">Telefon</label>
          <input name="phone" className="input" inputMode="tel" />
        </div>
      </div>
      <div>
        <label className="label">E-post *</label>
        <input name="email" type="email" className="input" required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Ønsket område</label>
          <input name="area" className="input" placeholder="F.eks. utenfor byen / sentrum" />
        </div>
        <div>
          <label className="label">Oppstart</label>
          <input name="startDate" type="date" className="input" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label">Soverom</label>
          <input name="bedrooms" type="number" min={1} className="input" defaultValue={1} />
        </div>
        <div>
          <label className="label">Personer</label>
          <input name="guests" type="number" min={1} className="input" defaultValue={1} />
        </div>
        <div>
          <label className="label">Varighet (mnd)</label>
          <input name="durationMonths" type="number" min={1} className="input" placeholder="3" />
        </div>
      </div>

      <div>
        <label className="label">Maks budsjett per måned (NOK)</label>
        <input name="maxBudget" type="number" min={0} className="input" placeholder="20000" />
      </div>

      <div>
        <label className="label">Beskriv ønsket ditt</label>
        <textarea
          name="message"
          rows={4}
          className="input"
          placeholder="F.eks: «Vil bo utenfor byen i 4 måneder for jobb, trenger parkering og god internett.»"
        />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800">{state.error}</p>
      )}

      <SubmitButton />
    </form>
  );
}
