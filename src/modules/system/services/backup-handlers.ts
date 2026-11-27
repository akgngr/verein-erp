import "server-only";

import { NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/modules/auth/server";
import { can } from "@/shared/permissions/define";
import { systemPermissions } from "@/shared/permissions/system";
import { buildDownloadResponse, parseSingleFileUpload } from "@/shared/files/http";
import { buildUserLabel } from "@/shared/utils";

import {
  getSystemBackupDownload,
  verifyUploadedSystemBackup,
} from "./backups";

const MAX_UPLOAD_VERIFY_BYTES = 250 * 1024 * 1024;

export async function downloadBackupHandler(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    throw error;
  }
  if (!can(user.role, systemPermissions, "update")) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id || !/^[a-zA-Z0-9_-]{4,80}$/.test(id)) {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
  }

  const download = await getSystemBackupDownload(id, {
    id: user.id,
    label: buildUserLabel(user.name, user.email),
  });
  if (!download) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return buildDownloadResponse({
    stream: download.stream,
    originalName: download.filename,
    mimeType: "application/octet-stream",
    inline: false,
  });
}

export async function verifyUploadedBackupHandler(request: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    throw error;
  }
  if (!can(user.role, systemPermissions, "update")) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const uploaded = await parseSingleFileUpload(request);
  if (!uploaded.ok) {
    return NextResponse.json(
      { error: uploaded.error },
      { status: uploaded.status },
    );
  }
  if (uploaded.file.size > MAX_UPLOAD_VERIFY_BYTES) {
    return NextResponse.json({ error: "ARCHIVE_TOO_LARGE" }, { status: 413 });
  }

  const result = await verifyUploadedSystemBackup(uploaded.file.buffer, {
    id: user.id,
    label: buildUserLabel(user.name, user.email),
  });

  return NextResponse.json(result, {
    status: 200,
    headers: { "Cache-Control": "private, no-store" },
  });
}
