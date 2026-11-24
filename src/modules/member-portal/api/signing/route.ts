import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getActivePortalSession } from "../../services/auth";
import { isPortalEnabled, PORTAL_SESSION_COOKIE } from "../../services/auth-core";
import { signPortalPendingForm } from "../../services/rights";

const SIGN_SCHEMA = z.object({
  requestId: z.string().min(1),
  signerName: z.string().trim().min(1).max(150),
});

export async function handlePortalSigningPost(request: Request): Promise<NextResponse> {
  if (!isPortalEnabled()) {
    return NextResponse.json({ ok: false, error: "notFound" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const session = await getActivePortalSession(cookieStore.get(PORTAL_SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalidPayload" }, { status: 400 });
  }

  const parsed = SIGN_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalidPayload" }, { status: 400 });
  }

  const result = await signPortalPendingForm(
    session.subjectRef,
    parsed.data.requestId,
    parsed.data.signerName,
  );
  if (!result.ok) {
    const status = result.reason === "licenseRequired" ? 403 : 400;
    return NextResponse.json({ ok: false, error: result.reason }, { status });
  }

  return NextResponse.json({ ok: true });
}
