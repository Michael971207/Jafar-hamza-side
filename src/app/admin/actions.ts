"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { checkPassword, startSession, endSession } from "@/lib/auth";
import { parseDateOnly } from "@/lib/dates";
import { syncAll } from "@/lib/sync";
import { closeDatesOnChannels } from "@/lib/channels";
import { sendBookingStatusEmail } from "@/lib/email";

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password)) {
    return { error: "Feil passord." };
  }
  startSession();
  redirect("/admin");
}

export async function logoutAction() {
  endSession();
  redirect("/admin/login");
}

// ── Hjelpere ─────────────────────────────────────────────────────────────────

function str(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}
function int(fd: FormData, k: string, fallback = 0) {
  const v = parseInt(String(fd.get(k) ?? ""), 10);
  return Number.isNaN(v) ? fallback : v;
}
function intOrNull(fd: FormData, k: string) {
  const v = parseInt(String(fd.get(k) ?? ""), 10);
  return Number.isNaN(v) ? null : v;
}
function bool(fd: FormData, k: string) {
  return fd.get(k) === "on" || fd.get(k) === "true";
}
function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
function jsonLines(fd: FormData, k: string): string {
  // Tekstområde med én URL per linje → JSON-array.
  const raw = str(fd, k);
  const arr = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  return JSON.stringify(arr);
}

// ── Leiligheter ──────────────────────────────────────────────────────────────

export async function upsertApartmentAction(formData: FormData) {
  const id = str(formData, "id");
  const title = str(formData, "title");
  const amenities = JSON.stringify(formData.getAll("amenities").map(String));

  let slug = str(formData, "slug") || slugify(title);

  const data = {
    title,
    slug,
    shortDesc: str(formData, "shortDesc"),
    description: str(formData, "description"),
    address: str(formData, "address"),
    city: str(formData, "city") || "Haugesund",
    area: str(formData, "area"),
    bedrooms: int(formData, "bedrooms", 1),
    bathrooms: int(formData, "bathrooms", 1),
    maxGuests: int(formData, "maxGuests", 2),
    sizeM2: intOrNull(formData, "sizeM2"),
    nightlyPrice: int(formData, "nightlyPrice", 0),
    monthlyPrice: intOrNull(formData, "monthlyPrice"),
    cleaningFee: int(formData, "cleaningFee", 0),
    images: jsonLines(formData, "images"),
    amenities,
    allowShortTerm: bool(formData, "allowShortTerm"),
    allowLongTerm: bool(formData, "allowLongTerm"),
    minNights: int(formData, "minNights", 1),
    maxNights: int(formData, "maxNights", 90),
    active: bool(formData, "active"),
    featured: bool(formData, "featured"),
  };

  if (id) {
    await prisma.apartment.update({ where: { id }, data });
  } else {
    // Sørg for unik slug.
    const existing = await prisma.apartment.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    await prisma.apartment.create({ data: { ...data, slug } });
  }

  revalidatePath("/admin/leiligheter");
  revalidatePath("/leiligheter");
  redirect("/admin/leiligheter");
}

/** Hurtig prisendring fra listevisningen – endrer pris umiddelbart. */
export async function updatePriceAction(formData: FormData) {
  const id = str(formData, "id");
  const nightlyPrice = int(formData, "nightlyPrice", 0);
  const monthlyPrice = intOrNull(formData, "monthlyPrice");
  await prisma.apartment.update({ where: { id }, data: { nightlyPrice, monthlyPrice } });
  revalidatePath("/admin/leiligheter");
  revalidatePath("/leiligheter");
}

export async function deleteApartmentAction(formData: FormData) {
  const id = str(formData, "id");
  await prisma.apartment.delete({ where: { id } });
  revalidatePath("/admin/leiligheter");
}

export async function toggleApartmentActiveAction(formData: FormData) {
  const id = str(formData, "id");
  const apt = await prisma.apartment.findUnique({ where: { id }, select: { active: true } });
  await prisma.apartment.update({ where: { id }, data: { active: !apt?.active } });
  revalidatePath("/admin/leiligheter");
}

// ── Bookinger ────────────────────────────────────────────────────────────────

export async function setBookingStatusAction(formData: FormData) {
  const id = str(formData, "id");
  const status = str(formData, "status");
  const booking = await prisma.booking.update({
    where: { id },
    data: { status },
    include: { apartment: true },
  });
  if (status === "confirmed") {
    await closeDatesOnChannels(booking.apartmentId, booking.checkIn, booking.checkOut);
  }
  // Statusmail til gjest. Skal aldri bryte flyten.
  try {
    await sendBookingStatusEmail(booking, booking.apartment, status);
  } catch (mailErr) {
    console.error("E-postvarsling (status) feilet:", mailErr);
  }
  revalidatePath("/admin/bookinger");
}

/** Manuell sperring av datoer (f.eks. eget bruk / vedlikehold). */
export async function createManualBlockAction(formData: FormData) {
  const apartmentId = str(formData, "apartmentId");
  const start = parseDateOnly(str(formData, "start"));
  const end = parseDateOnly(str(formData, "end"));
  if (apartmentId && start && end && end > start) {
    await prisma.calendarBlock.create({
      data: { apartmentId, start, end, source: "manual", reason: str(formData, "reason") || "Manuell sperring" },
    });
    await closeDatesOnChannels(apartmentId, start, end);
  }
  revalidatePath("/admin/bookinger");
}

export async function deleteBlockAction(formData: FormData) {
  const id = str(formData, "id");
  await prisma.calendarBlock.delete({ where: { id } });
  revalidatePath("/admin/bookinger");
}

// ── Forespørsler ─────────────────────────────────────────────────────────────

export async function updateInquiryStatusAction(formData: FormData) {
  const id = str(formData, "id");
  const status = str(formData, "status");
  await prisma.inquiry.update({ where: { id }, data: { status } });
  revalidatePath("/admin/foresporsler");
}

// ── Visninger ────────────────────────────────────────────────────────────────

export async function upsertViewingAction(formData: FormData) {
  const id = str(formData, "id");
  const startsAt = new Date(str(formData, "startsAt"));
  const endsRaw = str(formData, "endsAt");
  const data = {
    title: str(formData, "title"),
    description: str(formData, "description"),
    address: str(formData, "address"),
    startsAt,
    endsAt: endsRaw ? new Date(endsRaw) : null,
    apartmentId: str(formData, "apartmentId") || null,
    published: bool(formData, "published"),
  };
  if (id) {
    await prisma.viewing.update({ where: { id }, data });
  } else {
    await prisma.viewing.create({ data });
  }
  revalidatePath("/admin/visninger");
  revalidatePath("/visninger");
}

export async function deleteViewingAction(formData: FormData) {
  const id = str(formData, "id");
  await prisma.viewing.delete({ where: { id } });
  revalidatePath("/admin/visninger");
}

// ── Kanaler (iCal / Beds24) ──────────────────────────────────────────────────

export async function upsertChannelAction(formData: FormData) {
  const apartmentId = str(formData, "apartmentId");
  const channel = str(formData, "channel");
  const icalImportUrl = str(formData, "icalImportUrl") || null;
  const beds24RoomId = str(formData, "beds24RoomId") || null;
  await prisma.channelConnection.upsert({
    where: { apartmentId_channel: { apartmentId, channel } },
    update: { icalImportUrl, beds24RoomId, active: true },
    create: { apartmentId, channel, icalImportUrl, beds24RoomId, active: true },
  });
  revalidatePath(`/admin/leiligheter/${apartmentId}`);
}

export async function runSyncAction() {
  const results = await syncAll();
  revalidatePath("/admin");
  revalidatePath("/admin/bookinger");
  return results;
}

// ── Prisreferanser (Airbnb/Booking-sammenligning) ────────────────────────────

export async function upsertPriceReferenceAction(formData: FormData) {
  const apartmentId = str(formData, "apartmentId");
  const channel = str(formData, "channel");
  const guestPrice = int(formData, "guestPrice", 0);
  const feePercent = parseFloat(String(formData.get("feePercent") ?? "0")) || 0;
  await prisma.priceReference.upsert({
    where: { apartmentId_channel: { apartmentId, channel } },
    update: { guestPrice, feePercent, note: str(formData, "note") },
    create: { apartmentId, channel, guestPrice, feePercent, note: str(formData, "note") },
  });
  revalidatePath(`/admin/leiligheter/${apartmentId}`);
}
