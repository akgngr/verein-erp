import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getActivePortalSession, requestPortalStepUpLink } from "../../services/auth";
import { generateOpaqueToken, isPortalEnabled, PORTAL_NONCE_COOKIE, PORTAL_SESSION_COOKIE } from "../../services/auth-core";

const bodySchema = z.object({ locale: z.enum(["tr", "de"]).optional() }).strict();

/**
 * #580: POST /api/member-portal/step-up — oturum açık üyenin kayıtlı e-postasına tek kullanımlık ek doğrulama
 * bağlantısı gönderir (geçiş anahtarı doğrulaması gelene kadar). Yanıt adresi açığa vurmaz.
 */
export async function POST(req: NextRequest) {
  if (!isPortalEnabled()) return NextResponse.json({ ok: false, error: "notFound" }, { status: 404 });
  const session = await getActivePortalSession((await cookies()).get(PORTAL_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  let raw: unknown = {};
  try {
    const text = await req.text();
    if (text.length > 1024) return NextResponse.json({ ok: false, error: "invalidPayload" }, { status: 400 });
    raw = text.trim() ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ ok: false, error: "invalidPayload" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalidPayload" }, { status: 400 });

  const rawNonce = generateOpaqueToken(24);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const result = await requestPortalStepUpLink({ subjectRef: session.subjectRef, ip, rawNonce, origin: req.nextUrl.origin, locale: parsed.data.locale });
  if (!result.ok) return NextResponse.json({ ok: false, error: "unavailable" }, { status: 409 });

  const res = NextResponse.json({ ok: true, rateLimited: Boolean(result.rateLimited) });
  res.cookies.set(PORTAL_NONCE_COOKIE, rawNonce, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 15 * 60 });
  return res;
}
