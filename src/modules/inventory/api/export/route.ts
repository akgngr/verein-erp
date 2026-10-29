import { unstable_rethrow } from "next/navigation";
import { ForbiddenError } from "@/modules/auth/server";
import { exportInventoryCsv } from "../../services/inventory-service";

/** GET /api/inventory/export — Excel-compatible CSV of the (optionally filtered) inventory. */
export async function GET(request: Request): Promise<Response> {
  try {
    const searchParams = Object.fromEntries(new URL(request.url).searchParams);
    const file = await exportInventoryCsv(searchParams);

    return new Response(file.content, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${file.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ForbiddenError) {
      return new Response("Forbidden", { status: 403 });
    }
    console.error(
      "[inventory] export failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return new Response("Internal Server Error", { status: 500 });
  }
}
