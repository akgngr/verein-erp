import { createHash } from "node:crypto";

export function subjectHash(provider: string, subject: string): string {
  return createHash("sha256").update(JSON.stringify([provider, subject])).digest("hex");
}
