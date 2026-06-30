# Jafar Utleie – booking-plattform

Nettside for **korttids- og midttidsleie** av leiligheter i Haugesund og omegn.
Bygget rundt én jernhard regel: **dobbeltbooking skal aldri kunne skje** – verken
mellom Airbnb, Booking.com og denne siden, eller mellom to direkte-bookinger.

Stack: **Next.js 14 (App Router) · TypeScript · Tailwind · Prisma**. Database er
SQLite for MVP (bytt til Postgres for produksjon – se under).

---

## Hva er bygget

**For gjester (offentlig side – på norsk):**
- Forside med profil mot midttidsleie ("bo i 3–4 måneder i Haugesund").
- Leilighetsoversikt med søk på dato/område/gjester, og **fasilitets-ikoner**
  (parkering, vaskemaskin, kjøkken, sjøutsikt osv.).
- Leilighetsside med galleri, full fasilitetsliste, **tilgjengelighetskalender**
  og direkte booking for korttid.
- **Forespørselsskjema** for midt-/langtid: periode, antall rom, område, budsjett,
  fritekst ("vil bo utenfor byen i 4 mnd").
- Visningsside for nye leiligheter.
- Bookingbekreftelse med betalingsinfo (org.nr/kontonr).

**For Jafar (admin på `/admin`):**
- Innlogging med passord.
- Legg til / rediger / skjul leiligheter, med fasiliteter, bilder og regler.
- **Endre pris umiddelbart** rett fra listen (per natt og per måned).
- Bookinger: bekreft/avlys, og **manuell sperring** av datoer.
- Forespørsler: se og følg opp (status: ny → kontaktet → funnet bolig → avsluttet).
- Visninger: legg ut visningsinfo.
- **Kanalsynk** per leilighet (iCal-URLer + Beds24).
- **Prissammenligning**: legg inn Airbnb/Booking-pris + gebyr%, se hva du sitter
  igjen med og hvor lavt du kan prise direkte og likevel tjene like mye.

---

## Slik garanteres "ingen dobbeltbooking"

Den nye siden er **fasit-kalenderen** (single source of truth). En dato er opptatt
hvis den dekkes av en aktiv booking *eller* en `CalendarBlock` (importert fra
Airbnb/Booking, fra Beds24, eller manuell sperring).

1. **Direkte bookinger** opprettes i en databasetransaksjon som sjekker overlapp
   *rett før* skriving (`src/lib/booking.ts`). SQLite serialiserer skrivere, så to
   samtidige forsøk på samme periode kan aldri begge lykkes. Verifisert med test
   (5 samtidige forsøk → nøyaktig 1 lykkes).
2. **Ut mot Airbnb/Booking:** vi publiserer en iCal-kalender per leilighet på
   `/api/ical/<id>.ics`. Lim den inn i Airbnb og Booking, så ser de våre opptatt-
   datoer (inkl. reservasjoner fra den andre kanalen).
3. **Inn fra Airbnb/Booking:** vi importerer deres iCal-URLer og lager
   `CalendarBlock`-rader (`src/lib/sync.ts`). Kjøres via `/api/sync/ical`.
4. **Nær sanntid (anbefalt):** kobles **Beds24** på, pushes en bekreftet booking
   umiddelbart ut (stenger Airbnb/Booking), og innkommende bookinger der treffer
   webhooket `/api/webhooks/beds24` og stenger datoen hos oss med en gang.

> iCal alene har noen minutters forsinkelse (Airbnb poller ~hver time). For å
> fjerne det vinduet helt: bruk Beds24 (billig kanal-manager). Adapteren ligger
> klar i `src/lib/beds24.ts` – du trenger bare å sette `BEDS24_*` i miljøet.

---

## Kom i gang lokalt

```bash
npm install
cp .env.example .env        # fyll inn ADMIN_PASSWORD m.m.
npm run db:reset            # lager SQLite-db + seeder eksempeldata
npm run dev                 # http://localhost:3000
```

Admin: gå til `/admin/login` og bruk passordet fra `ADMIN_PASSWORD`.

### Synk Airbnb/Booking manuelt
Trykk **"Synk Airbnb/Booking nå"** i admin-oversikten, eller:
```bash
curl "http://localhost:3000/api/sync/ical?secret=$ADMIN_SESSION_SECRET"
```
I produksjon: sett opp en cron (f.eks. Vercel Cron) som treffer ruten hvert 15. min.

---

## Miljøvariabler

Se `.env.example`. Kort oppsummert:

| Variabel | Hva |
|---|---|
| `DATABASE_URL` | SQLite for MVP; Postgres-URL i produksjon |
| `ADMIN_PASSWORD` | Passord Jafar logger inn med |
| `ADMIN_SESSION_SECRET` | Lang tilfeldig streng (signerer admin-cookie + cron-secret) |
| `NEXT_PUBLIC_SITE_URL` | Brukes for å bygge iCal-eksport-URLer |
| `BEDS24_*` | Valgfritt – aktiverer nær-sanntids kanalsynk |
| `BUSINESS_*` | Org.nr/kontonr/adresse som vises på bekreftelser |

---

## Hva som gjenstår / krever dine kontoer

Disse er **arkitektonisk klare**, men trenger eksterne kontoer/nøkler du styrer:

- **Beds24** – opprett konto, legg leilighetene inn der, koble Airbnb+Booking til
  Beds24, og sett `BEDS24_*`. Da blir synken nær sanntid.
- **Online betaling (Vipps/Stripe)** – i dag bekreftes booking med faktura/
  bankoverføring (kontonr vises). Betalingssteget er isolert slik at Vipps/Stripe
  kan legges på uten å røre booking-logikken.
- **E-postvarsling** – ✅ implementert (se under). Trenger kun en Resend-konto
  + verifisert domene for å gå live.
- **Loyalty-program** – bevisst utsatt (lav prioritet).

---

## E-postvarsling

Automatiske varsler sendes ved (`src/lib/email.ts`):

| Hendelse | Til gjest | Til admin |
|---|---|---|
| Ny booking | Bekreftelse + betalingsinfo | Varsel med gjestedetaljer |
| Booking bekreftet (admin) | "Bekreftet" + betalingsinfo | — |
| Booking avlyst (admin) | "Avlyst" | — |
| Ny forespørsel (midt/langtid) | Kvittering | Varsel med ønsker |

Bruker **Resend** sitt HTTP-API direkte (ingen ekstra npm-pakke). **Uten
`RESEND_API_KEY` logges e-postene til konsollen i stedet for å sendes** – så
booking-/forespørselsflyten brytes aldri, og du kan teste alt før e-post er satt
opp. Sending er pakket i `try/catch`: en e-postfeil stopper aldri en booking.

**Sett opp (når du er klar):**
1. Opprett gratis konto på [resend.com](https://resend.com) og verifiser domenet ditt.
2. Sett i miljøet: `RESEND_API_KEY`, `EMAIL_FROM` (avsender på verifisert domene),
   `ADMIN_EMAIL` (hvor Jafar får varsler). Se `.env.example`.

---

## Produksjon (Postgres)

1. Endre `provider = "postgresql"` i `prisma/schema.prisma`.
2. Sett `DATABASE_URL` til Postgres (Neon/Supabase/Railway).
3. `npx prisma db push` (eller `migrate deploy`).
4. Deploy på Vercel e.l. Sett alle miljøvariabler. Legg til Vercel Cron mot
   `/api/sync/ical?secret=…`.

---

## Prosjektstruktur

```
src/
  app/
    page.tsx                  Forside
    leiligheter/              Oversikt + detalj + booking
    foresporsel/              Forespørselsskjema (midt/langtid)
    visninger/                Visninger
    booking/[id]/             Bookingbekreftelse
    admin/                    Innlogging + (panel)/ med alt admin
    api/ical/[id]/            iCal-eksport
    api/sync/ical/            iCal-import-trigger
    api/webhooks/beds24/      Beds24 webhook
  components/                 UI-komponenter
  lib/
    booking.ts                Tilgjengelighet + atomisk booking (kjernen)
    sync.ts                   iCal-import
    ical.ts                   iCal generator/parser
    beds24.ts                 Beds24-adapter
    channels.ts               Steng datoer på alle kanaler
    amenities.ts              Fasilitetskatalog (ikoner)
prisma/
  schema.prisma               Datamodell
  seed.ts                     Eksempeldata
```
