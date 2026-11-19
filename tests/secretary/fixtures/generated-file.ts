import { readFile } from "node:fs/promises";

import { resolveSafePath } from "@/shared/files/storage";
import { openBytes } from "@/shared/security/secret-box";

/** Yalnız test: şifreli üretilmiş dosyanın düz baytları (GCM doğrulamalı). */
export async function readGeneratedFileBytesForTest(id: string): Promise<Buffer> {
  const bytes = openBytes("generated-file", await readFile(resolveSafePath(`generated/${id}.bin`)));
  if (!bytes) throw new Error("UNREADABLE");
  return bytes;
}
