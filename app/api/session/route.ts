import { NextRequest, NextResponse } from "next/server";
import {
  COOKIE,
  cookieOptions,
  matchesPassword,
  newSession,
  validSession,
} from "../../../lib/session";
export const runtime = "nodejs";
const attempts = new Map<string, { at: number; count: number }>();
export async function GET(req: NextRequest) {
  return NextResponse.json(
    { signedIn: validSession(req.cookies.get(COOKIE)?.value) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return NextResponse.json(
      { detail: "Same-origin sign-in required" },
      { status: 403 },
    );
  if (!process.env.LAB_UI_PASSWORD)
    return NextResponse.json(
      { detail: "Write sign-in is not configured" },
      { status: 503 },
    );
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const now = Date.now();
  const prev = attempts.get(ip);
  const count = prev && now - prev.at < 60000 ? prev.count + 1 : 1;
  attempts.set(ip, { at: now, count });
  if (attempts.size > 1000) attempts.delete(attempts.keys().next().value!);
  if (count > 8)
    return NextResponse.json(
      { detail: "Too many attempts. Wait one minute." },
      { status: 429 },
    );
  try {
    const text = await req.text();
    if (text.length > 1024) throw Error();
    const data = JSON.parse(text);
    if (typeof data.password !== "string" || !matchesPassword(data.password))
      return NextResponse.json(
        { detail: "Incorrect sign-in password" },
        { status: 401 },
      );
    const res = NextResponse.json({ signedIn: true });
    res.cookies.set(COOKIE, newSession(), cookieOptions);
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch {
    return NextResponse.json(
      { detail: "Invalid sign-in request" },
      { status: 400 },
    );
  }
}
export async function DELETE(req: NextRequest) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return NextResponse.json(
      { detail: "Same-origin sign-out required" },
      { status: 403 },
    );
  const r = NextResponse.json({ signedIn: false });
  r.cookies.set(COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return r;
}
