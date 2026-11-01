import { feedbackScreenshotHandler } from "../../../server";

export const runtime = "nodejs";

/** GET ekran görüntüsü (yalnızca yönetici) — ince sarmalayıcı. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return feedbackScreenshotHandler(request, (await params).id);
}
