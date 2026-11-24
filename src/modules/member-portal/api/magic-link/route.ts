import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateOpaqueToken, isPortalEnabled, PORTAL_NONCE_COOKIE } from "../../services/auth-core";
import { requestPortalMagicLink } from "../../services/auth";

const bodySchema = z.object({
  email: z.string().email().max(200),
  locale: z.enum(["tr", "de"]).optional(),
});

export async function POST(req: NextRequest) {
  if (!isPortalEnabled()) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const rawNonce = generateOpaqueToken(24);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const origin = req.nextUrl.origin;

  await requestPortalMagicLink({
    email: parsed.data.email,
    ip,
    rawNonce,
    origin,
    locale: parsed.data.locale,
  });

  const res = NextResponse.json({ ok: true }, { status: 200 });
  res.cookies.set(PORTAL_NONCE_COOKIE, rawNonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 15 * 60,
  });
  return res;
}
