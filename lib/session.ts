import "server-only";
import { createHmac, timingSafeEqual, createHash } from "node:crypto";
export const COOKIE = "tamid-lab-session";
const ttl = 8 * 60 * 60;
function sign(value: string) {
  return createHmac("sha256", process.env.LAB_UI_PASSWORD || "unconfigured")
    .update(value)
    .digest("base64url");
}
export function matchesPassword(value: string) {
  const expected = process.env.LAB_UI_PASSWORD;
  if (!expected) return false;
  return timingSafeEqual(
    createHash("sha256").update(value).digest(),
    createHash("sha256").update(expected).digest(),
  );
}
export function newSession() {
  const payload = String(Math.floor(Date.now() / 1000));
  return payload + "." + sign(payload);
}
export function validSession(value?: string) {
  if (!process.env.LAB_UI_PASSWORD || !value) return false;
  const [payload, signature, ...extra] = value.split(".");
  if (!payload || !signature || extra.length) return false;
  const age = Math.floor(Date.now() / 1000) - Number(payload);
  if (!Number.isFinite(age) || age < 0 || age > ttl) return false;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: ttl,
};
