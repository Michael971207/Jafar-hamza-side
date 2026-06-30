import crypto from "crypto";
import { cookies } from "next/headers";

// Enkel, avhengighetsfri admin-innlogging:
// ett delt passord (ADMIN_PASSWORD) → signert sesjons-cookie (HMAC).
// Holder for én admin (Jafar). Bytt til NextAuth e.l. ved flere brukere.

const COOKIE_NAME = "jafar_admin";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 dager

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET || "insecure-dev-secret";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected) return false;
  return timingSafeEqual(input, expected);
}

function makeToken(): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = `admin.${issuedAt}`;
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [role, issuedAt, sig] = parts;
  const payload = `${role}.${issuedAt}`;
  if (!timingSafeEqual(sig, sign(payload))) return false;
  const age = Math.floor(Date.now() / 1000) - Number(issuedAt);
  return age >= 0 && age <= MAX_AGE;
}

export function startSession() {
  cookies().set(COOKIE_NAME, makeToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function endSession() {
  cookies().delete(COOKIE_NAME);
}

export function isLoggedIn(): boolean {
  return verifyToken(cookies().get(COOKIE_NAME)?.value);
}
