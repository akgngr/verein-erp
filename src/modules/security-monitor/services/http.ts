import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ForbiddenError, UnauthorizedError } from "@/modules/auth/server";

/**
 * #585: Güvenlik izleme API'leri için ortak hata eşlemesi. Önceden her hata (oturum yok, yetki yok, sunucu
 * hatası) ham mesajıyla HTTP 400 dönüyordu. Artık 401/403/400/404/500 ayrımı yapılır; yanıtta yalnız makine
 * kodu bulunur, ayrıntı sunucu günlüğüne yazılır.
 */
export class NotFoundError extends Error {
  constructor() {
    super("NOT_FOUND");
  }
}

export async function securityRoute(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    if (error instanceof ZodError || error instanceof SyntaxError) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    if (error instanceof NotFoundError) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    console.error("[security-monitor] request failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
