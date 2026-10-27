import { importTemplateHandler } from "@/modules/members/server";

export const runtime = "nodejs";

/** GET içe aktarma şablonu (.xlsx) — ince sarmalayıcı; mantık handlers/import-template.ts'te. */
export async function GET(): Promise<Response> {
  return importTemplateHandler();
}
