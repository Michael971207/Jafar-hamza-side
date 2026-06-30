import { NextResponse } from "next/server";
import { syncAll } from "@/lib/sync";
import { isLoggedIn } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Trigger for iCal-import fra Airbnb/Booking. Kjør jevnlig via cron, f.eks.:
//   curl "https://din-side.no/api/sync/ical?secret=<ADMIN_SESSION_SECRET>"
// På Vercel kan du sette opp Cron Jobs som treffer denne ruten hvert 15. min.

async function run(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  const authorized =
    isLoggedIn() ||
    (process.env.ADMIN_SESSION_SECRET && secret === process.env.ADMIN_SESSION_SECRET);

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await syncAll();
  const ok = results.every((r) => r.ok);
  return NextResponse.json({ ok, count: results.length, results });
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}
