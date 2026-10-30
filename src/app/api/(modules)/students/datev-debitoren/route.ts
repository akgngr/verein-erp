// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/students/api/datev-debitoren/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/students/api/datev-debitoren/route";

export const GET = gateRouteHandler("students", route.GET);
export const runtime = "nodejs";
