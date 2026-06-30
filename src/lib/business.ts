// Forretnings-/utbetalingsdetaljer. Hentes fra miljøvariabler slik at de
// enkelt kan endres uten kodeendring. Vises på bekreftelser og fakturaer.

export const business = {
  name: process.env.BUSINESS_NAME || "Jafar Utleie",
  orgNr: process.env.BUSINESS_ORG_NR || "837511402",
  accountNr: process.env.BUSINESS_ACCOUNT_NR || "15203333312",
  address: process.env.BUSINESS_ADDRESS || "Møllevegen 61, 4262 Avaldsnes",
};

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}
