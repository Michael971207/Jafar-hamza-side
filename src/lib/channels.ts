// Når en booking bekreftes hos oss, må datoene STENGES på alle andre kanaler.
//  - iCal-eksport oppdateres automatisk (den genereres på forespørsel), så
//    Airbnb/Booking ser den nye sperringen ved neste poll.
//  - Beds24 (hvis konfigurert) pushes umiddelbart → nær sanntid stenging.

import { prisma } from "@/lib/db";
import { beds24Enabled, pushAvailability } from "@/lib/beds24";

export async function closeDatesOnChannels(
  apartmentId: string,
  from: Date,
  to: Date,
): Promise<void> {
  if (!beds24Enabled()) return;
  const connections = await prisma.channelConnection.findMany({
    where: { apartmentId, channel: "beds24", active: true, beds24RoomId: { not: null } },
  });
  await Promise.all(
    connections.map((c) =>
      pushAvailability({
        beds24RoomId: c.beds24RoomId as string,
        from,
        to,
        available: false,
      }),
    ),
  );
}
