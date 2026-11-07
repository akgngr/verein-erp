import { runXmlHandler } from "../../../server";

export const runtime = "nodejs";

/** GET pain.008 XML — ince sarmalayıcı; mantık handlers/run-xml.ts'te. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  return runXmlHandler(request, { id });
}
