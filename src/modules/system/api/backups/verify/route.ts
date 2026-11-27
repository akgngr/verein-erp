import { verifyUploadedBackupHandler } from "../../../server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = verifyUploadedBackupHandler;
