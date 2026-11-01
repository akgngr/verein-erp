import { payoutPdfHandler } from "../../../server";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return payoutPdfHandler(request);
}
