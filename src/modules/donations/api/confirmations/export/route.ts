import { exportConfirmationsHandler } from "../../../server";

export const runtime = "nodejs";

/** GET Zuwendungsregister Excel — ince sarmalayıcı (§ 15 md. 9). */
export async function GET(request: Request): Promise<Response> {
  return exportConfirmationsHandler(request);
}
