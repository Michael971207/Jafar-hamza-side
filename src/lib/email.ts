// Automatisk e-postvarsling.
//
// Bruker Resend sitt HTTP-API direkte (ingen SDK/npm-avhengighet). Aktiveres ved
// å sette RESEND_API_KEY. Uten nøkkel LOGGES e-posten til konsollen i stedet for
// å sendes – slik at booking-/forespørselsflyten aldri brytes i utvikling eller
// før e-post er satt opp.

import { business } from "@/lib/business";
import { formatNok, formatDateNo } from "@/lib/format";
import type { Apartment, Booking, Inquiry } from "@prisma/client";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function fromAddress(): string {
  // F.eks. "Jafar Utleie <booking@dittdomene.no>"
  return process.env.EMAIL_FROM || `${business.name} <onboarding@resend.dev>`;
}

function adminEmail(): string | null {
  return process.env.ADMIN_EMAIL || null;
}

export type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

/** Sender én e-post. Kaster aldri – returnerer { ok } og logger ved feil. */
export async function sendEmail(args: SendArgs): Promise<{ ok: boolean; skipped?: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = Array.isArray(args.to) ? args.to : [args.to];

  if (!apiKey) {
    console.info(
      `[email] (ikke sendt – RESEND_API_KEY mangler) til=${to.join(",")} emne="${args.subject}"`,
    );
    return { ok: true, skipped: true };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to,
        subject: args.subject,
        html: args.html,
        ...(args.replyTo ? { reply_to: args.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[email] Resend-feil ${res.status}: ${body}`);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] Sending feilet:", err);
    return { ok: false };
  }
}

// ── HTML-mal ─────────────────────────────────────────────────────────────────

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="nb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f6f3ee;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0d1b1e;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="padding:8px 0 20px;font-size:20px;font-weight:700;color:#0f5e57;">${business.name}</div>
    <div style="background:#ffffff;border-radius:16px;padding:28px;box-shadow:0 10px 40px -12px rgba(13,27,30,.18);">
      <h1 style="margin:0 0 16px;font-size:22px;">${title}</h1>
      ${bodyHtml}
    </div>
    <div style="padding:18px 4px;color:#6b7e82;font-size:12px;line-height:1.6;">
      ${business.name} · ${business.address}<br>
      Org.nr ${business.orgNr} · Kontonr ${business.accountNr}
    </div>
  </div>
</body></html>`;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;color:#6b7e82;font-size:14px;">${label}</td>
    <td style="padding:6px 0;text-align:right;font-size:14px;font-weight:600;">${value}</td>
  </tr>`;
}

function bookingTable(booking: Booking, apartment: Apartment): string {
  return `<table style="width:100%;border-collapse:collapse;margin:8px 0 4px;">
    ${row("Leilighet", apartment.title)}
    ${row("Innsjekk", formatDateNo(booking.checkIn))}
    ${row("Utsjekk", formatDateNo(booking.checkOut))}
    ${row("Netter", String(booking.nights))}
    ${row("Gjester", String(booking.guests))}
    ${row("Totalt", formatNok(booking.totalPrice))}
  </table>`;
}

function paymentBox(booking: Booking): string {
  return `<div style="margin-top:18px;padding:16px;border:1px solid rgba(15,94,87,.2);background:rgba(15,94,87,.05);border-radius:12px;font-size:14px;">
    <strong>Betaling</strong>
    <table style="width:100%;border-collapse:collapse;margin-top:8px;">
      ${row("Mottaker", business.name)}
      ${row("Kontonr", business.accountNr)}
      ${row("Merk betaling", "Booking " + booking.id.slice(0, 8).toUpperCase())}
    </table>
  </div>`;
}

// ── Konkrete varsler ─────────────────────────────────────────────────────────

/** Sendes når en gjest har sendt en bookingforespørsel. */
export async function sendBookingReceivedEmails(booking: Booking, apartment: Apartment) {
  const guest = sendEmail({
    to: booking.email,
    subject: `Vi har mottatt bookingen din – ${apartment.title}`,
    replyTo: adminEmail() ?? undefined,
    html: layout(
      "Takk for bookingen!",
      `<p style="font-size:15px;line-height:1.6;color:#33474b;">
        Hei ${booking.guestName}, vi har mottatt forespørselen din og bekrefter den så
        snart som mulig. Her er detaljene:</p>
       ${bookingTable(booking, apartment)}
       ${paymentBox(booking)}
       <p style="font-size:13px;color:#6b7e82;margin-top:18px;">Har du spørsmål? Bare svar på denne e-posten.</p>`,
    ),
  });

  const admin = adminEmail()
    ? sendEmail({
        to: adminEmail() as string,
        subject: `Ny booking: ${apartment.title} (${formatDateNo(booking.checkIn)})`,
        replyTo: booking.email,
        html: layout(
          "Ny bookingforespørsel",
          `${bookingTable(booking, apartment)}
           <table style="width:100%;border-collapse:collapse;margin-top:8px;">
             ${row("Navn", booking.guestName)}
             ${row("E-post", booking.email)}
             ${row("Telefon", booking.phone || "—")}
           </table>
           ${booking.message ? `<p style="margin-top:14px;padding:12px;background:#f6f3ee;border-radius:10px;font-size:14px;">${booking.message}</p>` : ""}
           <p style="margin-top:16px;font-size:13px;color:#6b7e82;">Bekreft eller avlys i admin.</p>`,
        ),
      })
    : Promise.resolve({ ok: true });

  await Promise.all([guest, admin]);
}

/** Sendes når admin bekrefter eller avlyser en booking. */
export async function sendBookingStatusEmail(booking: Booking, apartment: Apartment, status: string) {
  if (status === "confirmed") {
    await sendEmail({
      to: booking.email,
      subject: `Bookingen er bekreftet – ${apartment.title}`,
      replyTo: adminEmail() ?? undefined,
      html: layout(
        "Bookingen din er bekreftet ✓",
        `<p style="font-size:15px;line-height:1.6;color:#33474b;">
          Hei ${booking.guestName}, vi gleder oss til å ta imot deg!</p>
         ${bookingTable(booking, apartment)}
         ${paymentBox(booking)}`,
      ),
    });
  } else if (status === "cancelled") {
    await sendEmail({
      to: booking.email,
      subject: `Bookingen er avlyst – ${apartment.title}`,
      replyTo: adminEmail() ?? undefined,
      html: layout(
        "Bookingen er avlyst",
        `<p style="font-size:15px;line-height:1.6;color:#33474b;">
          Hei ${booking.guestName}, bookingen din er dessverre avlyst. Ta kontakt hvis
          du har spørsmål, eller se etter andre ledige datoer.</p>
         ${bookingTable(booking, apartment)}`,
      ),
    });
  }
}

/** Sendes når en forespørsel (midt-/langtid) er sendt inn. */
export async function sendInquiryEmails(inquiry: Inquiry, apartmentTitle?: string) {
  const details = `<table style="width:100%;border-collapse:collapse;margin:8px 0;">
    ${apartmentTitle ? row("Gjelder", apartmentTitle) : ""}
    ${row("Område", inquiry.area || "—")}
    ${row("Oppstart", inquiry.startDate ? formatDateNo(inquiry.startDate) : "—")}
    ${row("Varighet", inquiry.durationMonths ? inquiry.durationMonths + " mnd" : "—")}
    ${row("Soverom / personer", `${inquiry.bedrooms} / ${inquiry.guests}`)}
    ${row("Maks budsjett", inquiry.maxBudget ? formatNok(inquiry.maxBudget) + "/mnd" : "—")}
  </table>`;

  const guest = sendEmail({
    to: inquiry.email,
    subject: "Vi har mottatt forespørselen din",
    replyTo: adminEmail() ?? undefined,
    html: layout(
      "Takk for forespørselen!",
      `<p style="font-size:15px;line-height:1.6;color:#33474b;">
        Hei ${inquiry.name}, vi har mottatt ønsket ditt og leter etter en leilighet som
        passer. Vi tar kontakt med et forslag.</p>
       ${details}`,
    ),
  });

  const admin = adminEmail()
    ? sendEmail({
        to: adminEmail() as string,
        subject: `Ny forespørsel: ${inquiry.name}${inquiry.durationMonths ? ` (${inquiry.durationMonths} mnd)` : ""}`,
        replyTo: inquiry.email,
        html: layout(
          "Ny leieforespørsel",
          `<table style="width:100%;border-collapse:collapse;">
             ${row("Navn", inquiry.name)}
             ${row("E-post", inquiry.email)}
             ${row("Telefon", inquiry.phone || "—")}
           </table>
           ${details}
           ${inquiry.message ? `<p style="margin-top:14px;padding:12px;background:#f6f3ee;border-radius:10px;font-size:14px;">${inquiry.message}</p>` : ""}`,
        ),
      })
    : Promise.resolve({ ok: true });

  await Promise.all([guest, admin]);
}
