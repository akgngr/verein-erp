import "server-only";

import { getDb } from "@/shared/db";

import { encryptArt15Payload } from "./art15-crypto";
import { createGeneratedFile, readGeneratedFile } from "./files";

export { encryptArt15Payload };

const ART15_SOURCE = "member-portal-art15";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function createEncryptedArt15ExportForPortal(input: {
  ownerId: string;
  payload: unknown;
}): Promise<{ fileId: string; expiresAt: Date }> {
  const encrypted = encryptArt15Payload(JSON.stringify(input.payload, null, 2));
  const created = await createGeneratedFile({
    ownerId: input.ownerId,
    title: "dsgvo-art15",
    format: "md",
    markdown: encrypted,
    source: ART15_SOURCE,
  });

  const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS);
  const db = getDb();
  await db.generatedFile.update({
    where: { id: created.id },
    data: { expiresAt },
  });

  return { fileId: created.id, expiresAt };
}

export async function readEncryptedArt15ExportForPortal(input: {
  ownerId: string;
  fileId: string;
}): Promise<{ bytes: Buffer; filename: string } | null> {
  const db = getDb();
  const file = await db.generatedFile.findFirst({
    where: {
      id: input.fileId,
      ownerId: input.ownerId,
      source: ART15_SOURCE,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  if (!file) return null;

  const loaded = await readGeneratedFile(input.ownerId, file.id);
  if (!loaded) return null;

  return {
    bytes: loaded.bytes,
    filename: `art15-auskunft-${file.id}.enc.json`,
  };
}
