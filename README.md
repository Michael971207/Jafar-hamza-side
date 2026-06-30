# Jafar Utleie – booking-plattform

Nettside for **korttids- og midttidsleie** av leiligheter i Haugesund og omegn.
Bygget rundt én jernhard regel: **dobbeltbooking skal aldri kunne skje** – verken
mellom Airbnb, Booking.com og denne siden, eller mellom to direkte-bookinger.

Stack: **Next.js 14 (App Router) · TypeScript · Tailwind · Prisma · PostgreSQL (Supabase)**.

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

1. **Direkte bookinger** opprettes i en databasetransaksjon som først tar en
   Postgres *advisory-lås* på leiligheten, så sjekker overlapp, så skriver
   (`src/lib/booking.ts`). Låsen gjør at samtidige forsøk på samme leilighet
   kjøres etter hverandre – aldri kan begge passere sjekken. Verifisert mot
   ekte Postgres (10 samtidige forsøk → nøyaktig 1 lykkes).
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

Du trenger en PostgreSQL-database. Enklest er en gratis **Supabase**-database
(se [Sette opp Supabase](#1-sette-opp-supabase-database) under) – bruk samme
URL lokalt og i produksjon. Alternativt en lokal Postgres.

```bash
npm install
cp .env.example .env        # fyll inn DATABASE_URL + DIRECT_URL (Supabase) + ADMIN_PASSWORD m.m.
npm run db:push             # oppretter tabellene i databasen
npm run db:seed             # legger inn eksempeldata (valgfritt)
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
| `DATABASE_URL` | Supabase pooled connection (port 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Supabase direkte connection (port 5432) – for `db push`/migrate |
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

## Innsjekk & chat

Hver booking får en **privat lenke** (`/min-booking/<token>`) – ingen innlogging.
Lenken sendes i bookingbekreftelsen og vises på kvitteringssiden.

På «Min booking» kan gjesten:
- Se status og detaljer.
- **Melde innsjekk** – da låses innsjekk-info opp (dørkode, WiFi, veibeskrivelse,
  satt per leilighet i admin) og Jafar varsles på e-post. Info låses også
  automatisk opp 2 dager før innsjekk.
- **Chatte** med utleier. Meldinger oppdateres med polling (hvert 8. sek), og
  begge parter får e-postvarsel ved nye meldinger.

Jafar svarer fra **admin → Bookinger → (åpne en booking)**, der hele samtalen og
innsjekk-status ligger. Uleste meldinger fra gjest vises med et merke i booking-
lista. Innsjekk-info redigeres på selve leiligheten (felt «Innsjekk»).

---

## Gå live – steg for steg

Appen er Next.js + Prisma + PostgreSQL. Databasen ligger på **Supabase**. For
selve nettsiden anbefales **Vercel** (enklest for Next.js + Prisma). En
**Cloudflare**-variant er beskrevet til slutt.

### 1. Sette opp Supabase (database)

1. Lag konto på [supabase.com](https://supabase.com) → **New project**. Velg
   region nær brukerne (f.eks. *EU (Frankfurt)* / *eu-north*), og sett et sterkt
   databasepassord (lagre det).
2. Når prosjektet er klart: **Project Settings → Database → Connection string**.
   - Kopier **Transaction pooler** (port `6543`) → dette blir `DATABASE_URL`.
     Legg til `?pgbouncer=true&connection_limit=1` på slutten.
   - Kopier **Session / Direct connection** (port `5432`) → dette blir `DIRECT_URL`.
   - Bytt ut `[YOUR-PASSWORD]` med databasepassordet i begge.
   - **Viktig:** har passordet spesialtegn (`@ # ? / : & %` osv.) må de
     prosent-kodes (`@`→`%40`, `#`→`%23`, …), ellers får du feilen *"invalid
     domain character in database URL"*. Enklest er å sette et passord uten
     spesialtegn (Settings → Database → Reset database password).
3. Opprett tabellene. Lokalt, med de to URLene i `.env`:
   ```bash
   npm run db:push     # oppretter alle tabeller i Supabase
   npm run db:seed     # (valgfritt) eksempeldata – dropp dette i ekte produksjon
   ```
   Du kan se tabellene i Supabase under **Table Editor**.

### 2. Deploye på Vercel (anbefalt)

1. Push koden til GitHub (allerede gjort for denne branchen).
2. Lag konto på [vercel.com](https://vercel.com) → **Add New → Project** → importer
   GitHub-repoet. Vercel oppdager Next.js automatisk.
3. Under **Environment Variables**, legg inn alt fra `.env.example` med ekte
   verdier: `DATABASE_URL`, `DIRECT_URL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`
   (lang tilfeldig streng), `NEXT_PUBLIC_SITE_URL` (din endelige URL), og evt.
   `STRIPE_*`, `RESEND_*`, `BEDS24_*`, `BUSINESS_*`.
4. **Deploy**. Bygget kjører `prisma generate && next build` automatisk.
5. **Domene:** Project → Settings → Domains → legg til ditt domene og følg
   DNS-instruksjonene. Oppdater `NEXT_PUBLIC_SITE_URL` til domenet.
6. **Cron for kalendersynk:** legg til en fil `vercel.json` (eller Project →
   Settings → Cron Jobs) som treffer `/api/sync/ical?secret=<ADMIN_SESSION_SECRET>`
   hvert 15. minutt:
   ```json
   { "crons": [{ "path": "/api/sync/ical?secret=DIN_SECRET", "schedule": "*/15 * * * *" }] }
   ```
7. **Stripe webhook:** i Stripe → Developers → Webhooks → legg til
   `https://ditt-domene/api/webhooks/stripe`, lytt på `checkout.session.completed`,
   og legg signeringshemmeligheten i `STRIPE_WEBHOOK_SECRET` på Vercel.

### 3. Etter deploy – sjekkliste

- Logg inn på `/admin`, legg inn leiligheter, priser og innsjekk-info.
- Lim inn `/api/ical/<id>.ics` (vises i admin per leilighet) i Airbnb og
  Booking.com, og lim deres iCal-URLer inn i admin → kanaler.
- (Valgfritt) Koble Beds24 for nær sanntid.
- Verifiser domene i Resend og slå på online betaling i Stripe når du er klar.

### Alternativ: Cloudflare Pages

Cloudflare Pages kan kjøre Next.js, men det krever litt mer fordi Prisma ikke
kjører på Cloudflare sin edge-runtime som standard:

1. Bruk adapteren **`@cloudflare/next-on-pages`** (build-kommando
   `npx @cloudflare/next-on-pages`).
2. Prisma på edge må gå via **Prisma Accelerate** (sett `DATABASE_URL` til
   Accelerate-URLen din), eller bruk en Postgres-driveradapter. Supabase forblir
   databasen bak.
3. Sett samme miljøvariabler i Cloudflare Pages → Settings → Environment
   variables, og bruk **Cloudflare Cron Triggers** mot `/api/sync/ical`.

Fordi dette krever ekstra oppsett (Accelerate + adapter), anbefales Vercel for
raskest mulig live-gang. Si fra om du vil at jeg setter opp Cloudflare-varianten
fullt ut.

---

## Feilsøking

**`invalid domain character in database URL` / `Invalid prisma...invocation`**
Databasepassordet i `DATABASE_URL`/`DIRECT_URL` har et spesialtegn som ikke er
prosent-kodet. Kod tegnene (`@`→`%40`, `#`→`%23`, `?`→`%3F`, `/`→`%2F`,
`:`→`%3A`, `&`→`%26`, `%`→`%25`), eller sett et passord uten spesialtegn i
Supabase. Begge URLene må oppdateres.

**`Can't reach database server`** – sjekk at du bruker riktige porter
(app = 6543 pooled, `db push` = 5432 direct) og at prosjektet ikke er pauset i
Supabase (gratis-prosjekter pauses ved inaktivitet – åpne dashbordet for å vekke det).

**Sjekke at alt bygger lokalt før deploy:**
```bash
npx tsc --noEmit     # streng TypeScript-sjekk (skal gi 0 feil)
npm run build        # full produksjonsbuild
```

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
