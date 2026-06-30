"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  createBooking,
  BookingConflictError,
  BookingValidationError,
} from "@/lib/booking";
import { closeDatesOnChannels } from "@/lib/channels";
import { parseDateOnly } from "@/lib/dates";

export type BookingFormState = { error?: string } | undefined;

export async function createBookingAction(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const apartmentId = String(formData.get("apartmentId") ?? "");
  const guestName = String(formData.get("guestName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const guests = parseInt(String(formData.get("guests") ?? "1"), 10) || 1;
  const message = String(formData.get("message") ?? "").trim();
  const checkIn = parseDateOnly(String(formData.get("from") ?? ""));
  const checkOut = parseDateOnly(String(formData.get("to") ?? ""));

  if (!guestName || !email) {
    return { error: "Navn og e-post er påkrevd." };
  }
  if (!checkIn || !checkOut) {
    return { error: "Velg gyldige inn- og utsjekksdatoer." };
  }

  let bookingId: string;
  try {
    const booking = await createBooking({
      apartmentId,
      guestName,
      email,
      phone,
      guests,
      message,
      checkIn,
      checkOut,
      source: "direct",
      status: "pending", // bekreftes når betaling/faktura er ordnet
    });
    bookingId = booking.id;

    // Steng datoene på øvrige kanaler umiddelbart (Beds24 hvis konfigurert).
    await closeDatesOnChannels(apartmentId, booking.checkIn, booking.checkOut);
  } catch (err) {
    if (err instanceof BookingConflictError) {
      return { error: "Beklager – datoene ble nettopp booket. Velg en annen periode." };
    }
    if (err instanceof BookingValidationError) {
      return { error: err.message };
    }
    console.error("Booking feilet:", err);
    return { error: "Noe gikk galt. Prøv igjen." };
  }

  redirect(`/booking/${bookingId}`);
}

/** Brukes av admin til å bekrefte/avlyse. Plassert her for gjenbruk. */
export async function setBookingStatus(bookingId: string, status: string) {
  await prisma.booking.update({ where: { id: bookingId }, data: { status } });
}
