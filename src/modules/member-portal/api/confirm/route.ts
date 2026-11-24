import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  isPortalEnabled,
  PORTAL_NONCE_COOKIE,
  PORTAL_SESSION_COOKIE,
  PORTAL_SESSION_ABSOLUTE_MS,
} from "../../services/auth-core";
import { consumePortalMagicLinkPost } from "../../services/auth";

const confirmSchema = z.object({
  token: z.string().min(10).max(512),
});

/** POST-only magic-link consumption (scanner GET never consumes the token). */
export async function POST(req: NextRequest) {
  if (!isPortalEnabled()) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }

  const rawNonce = req.cookies.get(PORTAL_NONCE_COOKIE)?.value;
  if (!rawNonce) {
    return NextResponse.json({ error: "invalidOrExpired" }, { status: 400 });
  }

  let token = "";
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as { token?: string };
    token = body.token ?? "";
  } else {
    const form = await req.formData().catch(() => null);
    token = String(form?.get("token") ?? "");
  }

  const parsed = confirmSchema.safeParse({ token });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalidOrExpired" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const result = await consumePortalMagicLinkPost({
    rawToken: parsed.data.token,
    rawNonce,
    ip,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason },
      { status: result.reason === "rate_limited" ? 429 : 400 },
    );
  }

  const res = NextResponse.redirect(new URL("/portal", req.nextUrl.origin), 303);
  res.cookies.delete(PORTAL_NONCE_COOKIE);
  res.cookies.set(PORTAL_SESSION_COOKIE, result.rawSessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(PORTAL_SESSION_ABSOLUTE_MS / 1000),
  });
  return res;
}
