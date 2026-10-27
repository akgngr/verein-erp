import "server-only";

import { previewMemberSync } from "../services/member-sync";

/** Üyelik aktarımı önizleme (§ 11.7) — servise delege eder. */
export function getMemberSyncPreview() {
  return previewMemberSync();
}
