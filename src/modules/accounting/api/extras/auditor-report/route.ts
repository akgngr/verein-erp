import { auditorReportHandler } from "../../../server";

export const runtime = "nodejs";

/** GET Kassenprüfungsbericht PDF — ince sarmalayıcı (ACC-8). */
export async function GET(request: Request): Promise<Response> {
  return auditorReportHandler(request);
}
