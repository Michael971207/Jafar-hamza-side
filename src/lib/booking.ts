import crypto from "crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { nightsBetween, toUtcDate } from "@/lib/dates";

/** Privat, ugjettbar token til gjestens "Min booking"-side. */
export function generateAccessToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

// ─────────────────────────────────────────────────────────────────────────────
// ANTI-DOBBELTBOOKING
//
// All tilgjengelighet styres av ÉN kilde: denne databasen. En dato er opptatt
// hvis den dekkes av enten en aktiv booking (pending/confirmed) ELLER en
// CalendarBlock (importert fra Airbnb/Booking via iCal/Beds24, eller manuell).
//
// Opprettelse av booking skjer i en transaksjon som FØRST sjekker overlapp og
// DERETTER skriver. SQLite serialiserer skrivere, så to samtidige forsøk kan
// aldri begge passere sjekken. Bytt til Postgres → bruk Serializable isolation.
// ─────────────────────────────────────────────────────────────────────────────

type Client = PrismaClient | Prisma.TransactionClient;

const ACTIVE_STATUSES = ["pending", "confirmed"];

/** Returnerer overlappende bookinger for en periode (halvåpent [checkIn, checkOut)). */
async function overlappingBookings(
  client: Client,
  apartmentId: string,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string,
) {
  return client.booking.findMany({
    where: {
      apartmentId,
      status: { in: ACTIVE_STATUSES },
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      // Overlapp: eksisterende.checkIn < ny.checkOut OG eksisterende.checkOut > ny.checkIn
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
    },
    select: { id: true, checkIn: true, checkOut: true, source: true },
  });
}

/** Returnerer overlappende kalenderblokker (eksterne/manuelle sperringer). */
async function overlappingBlocks(
  client: Client,
  apartmentId: string,
  checkIn: Date,
  checkOut: Date,
) {
  return client.calendarBlock.findMany({
    where: {
      apartmentId,
      start: { lt: checkOut },
      end: { gt: checkIn },
    },
    select: { id: true, start: true, end: true, source: true, reason: true },
  });
}

export async function isAvailable(
  apartmentId: string,
  checkIn: Date,
  checkOut: Date,
  client: Client = prisma,
): Promise<boolean> {
  const [b, k] = await Promise.all([
    overlappingBookings(client, apartmentId, checkIn, checkOut),
    overlappingBlocks(client, apartmentId, checkIn, checkOut),
  ]);
  return b.length === 0 && k.length === 0;
}

export type CreateBookingInput = {
  apartmentId: string;
  guestName: string;
  email: string;
  phone?: string;
  guests?: number;
  message?: string;
  checkIn: Date;
  checkOut: Date;
  source?: string; // direct | airbnb | booking | beds24 | manual
  channelRef?: string | null;
  status?: string; // default "confirmed" for kanal-import, "pending" for direkte
};

export class BookingConflictError extends Error {
  constructor(message = "Datoene er ikke lenger ledige.") {
    super(message);
    this.name = "BookingConflictError";
  }
}

export class BookingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingValidationError";
  }
}

/**
 * Oppretter en booking trygt. Kaster BookingConflictError hvis datoene
 * (rett før skriving) viser seg å være opptatt. Dette er den eneste lovlige
 * veien til å lage en booking i systemet.
 */
export async function createBooking(input: CreateBookingInput) {
  const checkIn = toUtcDate(input.checkIn);
  const checkOut = toUtcDate(input.checkOut);
  const nights = nightsBetween(checkIn, checkOut);

  if (nights < 1) {
    throw new BookingValidationError("Utsjekk må være etter innsjekk.");
  }

  return prisma.$transaction(async (tx) => {
    const apartment = await tx.apartment.findUnique({
      where: { id: input.apartmentId },
    });
    if (!apartment || !apartment.active) {
      throw new BookingValidationError("Leiligheten finnes ikke eller er ikke aktiv.");
    }
    if (nights < apartment.minNights) {
      throw new BookingValidationError(`Minimum ${apartment.minNights} netter.`);
    }
    if (nights > apartment.maxNights) {
      throw new BookingValidationError(`Maksimum ${apartment.maxNights} netter for denne enheten.`);
    }

    // Siste sjekk RETT FØR skriving – inne i transaksjonen.
    const available = await isAvailable(input.apartmentId, checkIn, checkOut, tx);
    if (!available) {
      throw new BookingConflictError();
    }

    const totalPrice =
      nights * apartment.nightlyPrice + (apartment.cleaningFee ?? 0);

    return tx.booking.create({
      data: {
        apartmentId: input.apartmentId,
        guestName: input.guestName,
        email: input.email,
        phone: input.phone ?? "",
        guests: input.guests ?? 1,
        message: input.message ?? "",
        checkIn,
        checkOut,
        nights,
        totalPrice,
        source: input.source ?? "direct",
        channelRef: input.channelRef ?? null,
        status: input.status ?? "pending",
        accessToken: generateAccessToken(),
      },
    });
  }, {
    // SQLite serialiserer skrivere; gi køen rikelig tid slik at legitime
    // samtidige bookinger ikke timer ut (uten å svekke overlapp-garantien).
    timeout: 15000,
    maxWait: 12000,
  });
}

/** Henter alle opptatt-perioder (bookinger + blokker) for en leilighet fremover. */
export async function getBusyRanges(apartmentId: string, from?: Date) {
  const fromDate = from ?? toUtcDate(new Date());
  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({
      where: {
        apartmentId,
        status: { in: ACTIVE_STATUSES },
        checkOut: { gt: fromDate },
      },
      select: { checkIn: true, checkOut: true, source: true },
      orderBy: { checkIn: "asc" },
    }),
    prisma.calendarBlock.findMany({
      where: { apartmentId, end: { gt: fromDate } },
      select: { start: true, end: true, source: true },
      orderBy: { start: "asc" },
    }),
  ]);

  const ranges = [
    ...bookings.map((b) => ({ start: b.checkIn, end: b.checkOut, source: b.source })),
    ...blocks.map((b) => ({ start: b.start, end: b.end, source: b.source })),
  ];
  ranges.sort((a, b) => a.start.getTime() - b.start.getTime());
  return ranges;
}
