// Beds24-adapter (valgfri, nær sanntid).
//
// Beds24 er en billig kanal-manager som snakker offisielt med Airbnb og
// Booking.com. Strategien: den nye siden er "fasit"-kalenderen. Når en booking
// bekreftes hos oss pusher vi sperring til Beds24, som sperrer på Airbnb/Booking.
// Når noen booker på Airbnb/Booking sender Beds24 et webhook til oss, og vi
// lager en CalendarBlock slik at datoen umiddelbart stenges overalt.
//
// Dette er bevisst en TYNN adapter: sett BEDS24_* i miljøet for å aktivere.
// Uten nøkler er alle funksjoner no-ops, og iCal-synk dekker behovet.

const API_BASE = "https://api.beds24.com/json";

export function beds24Enabled(): boolean {
  return Boolean(process.env.BEDS24_API_KEY && process.env.BEDS24_PROP_KEY);
}

type PushArgs = {
  beds24RoomId: string;
  from: Date;
  to: Date; // eksklusiv
  available: boolean;
};

/**
 * Pusher tilgjengelighet for en periode til Beds24. No-op hvis ikke konfigurert.
 * Returnerer true ved suksess, false ved feil/avskrudd (kaller bør logge).
 */
export async function pushAvailability(args: PushArgs): Promise<boolean> {
  if (!beds24Enabled()) return false;
  try {
    const res = await fetch(`${API_BASE}/setAvailabilities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authentication: {
          apiKey: process.env.BEDS24_API_KEY,
          propKey: process.env.BEDS24_PROP_KEY,
        },
        roomId: args.beds24RoomId,
        // Beds24 forventer dato-nøkler YYYY-MM-DD med qty (0 = opptatt).
        availability: buildAvailabilityMap(args.from, args.to, args.available),
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("Beds24 pushAvailability feilet:", err);
    return false;
  }
}

function buildAvailabilityMap(from: Date, to: Date, available: boolean) {
  const map: Record<string, number> = {};
  for (let d = new Date(from); d < to; d.setUTCDate(d.getUTCDate() + 1)) {
    map[d.toISOString().slice(0, 10)] = available ? 1 : 0;
  }
  return map;
}

export type Beds24Webhook = {
  bookId?: string;
  roomId?: string;
  status?: string; // "1" = ny/bekreftet, "0"/"cancelled" = avlyst
  arrival?: string; // YYYY-MM-DD
  departure?: string; // YYYY-MM-DD
  guestName?: string;
  channel?: string; // "airbnb" | "bookingcom" | ...
};

/** Verifiserer at et innkommende webhook har riktig delt hemmelighet. */
export function verifyWebhookSecret(provided: string | null): boolean {
  const expected = process.env.BEDS24_WEBHOOK_SECRET;
  if (!expected) return false;
  return provided === expected;
}
