import { exportDuesHandler } from "@/modules/members/server";

export const runtime = "nodejs";

/** GET aidat raporu Excel — ince sarmalayıcı; mantık handlers/export-dues.ts'te. */
export async function GET(request: Request): Promise<Response> {
  return exportDuesHandler(request);
}
