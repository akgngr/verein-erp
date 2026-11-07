import { NextResponse } from "next/server";

import { isRedirectable, recordClick, verifyLink } from "../../../../services/tracking";

/**
 * GET /api/mailings/t/c/<belirteç>?u=<hedef>&s=<imza> — bağlantı tıklaması. İmza, hedefin gönderdiğimiz
 * e-postadaki bağlantı olduğunu doğrular (açık yönlendirme yok); imza tutmazsa yönlendirme yapılmaz.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = new URL(request.url);
  const target = url.searchParams.get("u") ?? "";
  const signature = url.searchParams.get("s") ?? "";
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token) || !isRedirectable(target) || !verifyLink(token, target, signature)) {
    return new NextResponse(null, { status: 404 });
  }
  await recordClick(token).catch(() => undefined);
  return NextResponse.redirect(target, 302);
}
