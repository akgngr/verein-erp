import { recordOpen } from "../../../../services/tracking";

// 1×1 şeffaf GIF.
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

/**
 * GET /api/mailings/t/o/<belirteç> — e-posta açılma pikseli. Oturum yok (alıcının e-posta istemcisi
 * çağırır); belirteç rastgele ve tahmin edilemez. Her durumda aynı görsel döner (belirteç sızdırılmaz).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (/^[A-Za-z0-9_-]{20,40}$/.test(token)) await recordOpen(token).catch(() => undefined);
  return new Response(new Uint8Array(PIXEL), {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, max-age=0", "Content-Length": String(PIXEL.length) },
  });
}
