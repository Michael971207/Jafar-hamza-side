"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { parseDateOnly } from "@/lib/dates";

export type InquiryState = { error?: string } | undefined;

export async function createInquiryAction(
  _prev: InquiryState,
  formData: FormData,
): Promise<InquiryState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  if (!name || !email) {
    return { error: "Navn og e-post er påkrevd." };
  }

  const apartmentId = String(formData.get("apartmentId") ?? "").trim() || null;
  const num = (k: string) => {
    const v = parseInt(String(formData.get(k) ?? ""), 10);
    return Number.isNaN(v) ? null : v;
  };

  const inquiry = await prisma.inquiry.create({
    data: {
      apartmentId,
      name,
      email,
      phone: String(formData.get("phone") ?? "").trim(),
      area: String(formData.get("area") ?? "").trim(),
      bedrooms: num("bedrooms") ?? 1,
      guests: num("guests") ?? 1,
      startDate: parseDateOnly(String(formData.get("startDate") ?? "")) ?? undefined,
      durationMonths: num("durationMonths") ?? undefined,
      maxBudget: num("maxBudget") ?? undefined,
      message: String(formData.get("message") ?? "").trim(),
      status: "new",
    },
  });

  redirect(`/foresporsel/takk?id=${inquiry.id}`);
}
