import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { PORTAL_CORRECTION_FIELDS } from "@/modules/members/server";

import { getActivePortalSession } from "../../services/auth";
import { isPortalEnabled, PORTAL_SESSION_COOKIE } from "../../services/auth-core";
import { submitPortalCorrection } from "../../services/self-service";

const CORRECTION_SCHEMA = z.object({
  field: z.enum(PORTAL_CORRECTION_FIELDS),
  proposedValue: z.string().trim().min(1).max(200),
});

export async function POST(request: Request): Promise<NextResponse> {
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

  const parsed = CORRECTION_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalidPayload" }, { status: 400 });
  }

  const created = await submitPortalCorrection({
    subjectRef: session.subjectRef,
    field: parsed.data.field,
    proposedValue: parsed.data.proposedValue,
  });

  if (!created) {
    return NextResponse.json({ ok: false, error: "invalidPayload" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: created.id });
}
