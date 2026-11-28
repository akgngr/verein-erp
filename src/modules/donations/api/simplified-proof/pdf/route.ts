import { simplifiedProofPdfHandler } from "../../../server";

export const runtime = "nodejs";

/** GET /api/donations/simplified-proof/pdf — § 50 Abs. 4 Nr. 2 EStDV (<= 300 EUR). */
export async function GET(request: Request): Promise<Response> {
  return simplifiedProofPdfHandler(request);
}
