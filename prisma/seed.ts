import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

async function main() {
  console.log("Seeder database …");

  // Tøm i avhengighetsrekkefølge (for idempotent reseed).
  await prisma.priceReference.deleteMany();
  await prisma.channelConnection.deleteMany();
  await prisma.calendarBlock.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.viewing.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.apartment.deleteMany();

  const sentrum = await prisma.apartment.create({
    data: {
      slug: "sentrum-moderne-2roms",
      title: "Moderne 2-roms i Haugesund sentrum",
      shortDesc: "Lyst og nyoppusset, gangavstand til alt.",
      description:
        "Stilig 2-roms leilighet midt i Haugesund sentrum. Nyoppusset med åpen kjøkkenløsning, " +
        "god arbeidsplass og rask WiFi. Perfekt for jobbreisende og par. Kort vei til kaien, " +
        "restauranter og butikker.",
      address: "Haraldsgata 120",
      city: "Haugesund",
      area: "Sentrum",
      bedrooms: 1,
      bathrooms: 1,
      maxGuests: 3,
      sizeM2: 52,
      nightlyPrice: 1190,
      monthlyPrice: 16500,
      cleaningFee: 600,
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80",
        "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&q=80",
        "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80",
      ]),
      amenities: JSON.stringify([
        "wifi", "kitchen", "washer", "tv", "heating", "workspace", "coffee", "bedlinen", "selfcheckin",
      ]),
      allowShortTerm: true,
      allowLongTerm: true,
      minNights: 2,
      maxNights: 120,
      featured: true,
      checkInTime: "15:00",
      checkOutTime: "11:00",
      checkInInfo:
        "Dørkode: 4821 (tast inn og trykk nøkkel-symbol).\n" +
        "WiFi: Sentrum-Gjest / passord: velkommen2026\n" +
        "Inngang fra baksiden, 2. etasje. Søppel i kjeller. Ta kontakt i chatten om noe er uklart!",
    },
  });

  const avaldsnes = await prisma.apartment.create({
    data: {
      slug: "avaldsnes-sjoutsikt-3roms",
      title: "Romslig 3-roms med sjøutsikt – Avaldsnes",
      shortDesc: "Rolig beliggenhet utenfor byen, fantastisk utsikt.",
      description:
        "Stor og lys leilighet på Avaldsnes med panoramautsikt mot sjøen. Egen parkering og " +
        "balkong. Ideell for familier eller lengre opphold (midt-/langtid). Stille omgivelser, " +
        "men kun 15 min til Haugesund sentrum.",
      address: "Møllevegen 61",
      city: "Karmøy",
      area: "Avaldsnes (utenfor byen)",
      bedrooms: 2,
      bathrooms: 1,
      maxGuests: 5,
      sizeM2: 84,
      nightlyPrice: 1490,
      monthlyPrice: 19500,
      cleaningFee: 800,
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80",
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80",
        "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1200&q=80",
      ]),
      amenities: JSON.stringify([
        "wifi", "parking", "kitchen", "washer", "dryer", "dishwasher", "tv", "heating",
        "balcony", "seaview", "garden", "charger", "bedlinen",
      ]),
      allowShortTerm: true,
      allowLongTerm: true,
      minNights: 1,
      maxNights: 180,
      featured: true,
    },
  });

  const studio = await prisma.apartment.create({
    data: {
      slug: "kompakt-studio-naer-sykehuset",
      title: "Kompakt studio nær sykehuset",
      shortDesc: "Praktisk for vikarer og jobbreisende på mellomlange opphold.",
      description:
        "Effektiv og rimelig studioleilighet i gangavstand til Haugesund sjukehus. Populær for " +
        "helsepersonell og pendlere som trenger bolig i noen uker eller måneder.",
      address: "Karmsundgata 60",
      city: "Haugesund",
      area: "Sentrum",
      bedrooms: 1,
      bathrooms: 1,
      maxGuests: 2,
      sizeM2: 34,
      nightlyPrice: 890,
      monthlyPrice: 12900,
      cleaningFee: 500,
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80",
        "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200&q=80",
      ]),
      amenities: JSON.stringify([
        "wifi", "kitchen", "washer", "tv", "heating", "workspace", "selfcheckin", "bedlinen",
      ]),
      allowShortTerm: true,
      allowLongTerm: true,
      minNights: 3,
      maxNights: 120,
    },
  });

  // Eksempel-booking (bekreftet) som blokkerer noen datoer.
  const demoBooking = await prisma.booking.create({
    data: {
      apartmentId: sentrum.id,
      guestName: "Ola Nordmann",
      email: "ola@example.com",
      phone: "+47 900 00 000",
      guests: 2,
      checkIn: daysFromNow(5),
      checkOut: daysFromNow(9),
      nights: 4,
      totalPrice: 4 * 1190 + 600,
      status: "confirmed",
      source: "direct",
      accessToken: "demo-booking-token-0123456789abcdef",
    },
  });

  // Eksempel-chat på demo-bookingen.
  await prisma.message.create({
    data: { bookingId: demoBooking.id, sender: "guest", body: "Hei! Er det mulig med tidlig innsjekk rundt kl. 13?", readByGuest: true },
  });
  await prisma.message.create({
    data: { bookingId: demoBooking.id, sender: "host", body: "Hei Ola! Det skal gå fint, leiligheten er klar fra 13. Velkommen!", readByHost: true },
  });

  // Eksempel: importert opptatt-periode fra Airbnb (som om iCal-synk hadde kjørt).
  await prisma.calendarBlock.create({
    data: {
      apartmentId: avaldsnes.id,
      start: daysFromNow(12),
      end: daysFromNow(15),
      source: "airbnb",
      reason: "Reservert (Airbnb)",
      externalUid: "seed-airbnb-1",
    },
  });

  // Eksempel-forespørsel (midt-/langtid).
  await prisma.inquiry.create({
    data: {
      name: "Kari Hansen",
      email: "kari@example.com",
      phone: "+47 911 11 111",
      area: "utenfor byen",
      bedrooms: 2,
      guests: 3,
      startDate: daysFromNow(30),
      durationMonths: 4,
      maxBudget: 20000,
      message: "Ønsker rolig leilighet utenfor sentrum i ca. 4 måneder for jobb.",
      status: "new",
    },
  });

  // Eksempel-visning.
  await prisma.viewing.create({
    data: {
      title: "Visning: ny 4-roms i Skåredalen",
      description:
        "Vi legger snart ut en ny familieleilighet i Skåredalen. Kom på visning og se " +
        "standarden. Påmelding på e-post.",
      address: "Skåredalen, Haugesund",
      startsAt: daysFromNow(7),
      published: true,
    },
  });

  // Eksempel-koblinger (iCal). URLene er placeholders – byttes med ekte i admin.
  await prisma.channelConnection.create({
    data: { apartmentId: sentrum.id, channel: "airbnb", icalImportUrl: null, active: true },
  });
  await prisma.channelConnection.create({
    data: { apartmentId: avaldsnes.id, channel: "booking", icalImportUrl: null, active: true },
  });

  // Eksempel-prisreferanser (for "hvor mye billigere"-kalkulatoren).
  await prisma.priceReference.create({
    data: { apartmentId: sentrum.id, channel: "airbnb", guestPrice: 1490, feePercent: 15, note: "Airbnb m/service fee" },
  });
  await prisma.priceReference.create({
    data: { apartmentId: sentrum.id, channel: "booking", guestPrice: 1550, feePercent: 15, note: "Booking.com provisjon" },
  });

  console.log("Ferdig. 3 leiligheter, 1 booking, 1 blokk, 1 forespørsel, 1 visning opprettet.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
