import "server-only";

import type { Meeting, MeetingStatus, Role } from "@prisma/client";

import { ActionError } from "@/modules/auth/server";
import { can, type PermissionDefinition } from "@/shared/permissions/define";

import { MEETING_STATUS_TRANSITIONS } from "../constants";

/** Kilit kapsamları (5. bölüm md. 4). */
export type EditScope = "content" | "actionStatus" | "files" | "fileDelete";

/** Onaylanmış toplantı için standart kilit hatası (5. bölüm md. 4). */
export function lockedMeetingError(): ActionError {
  return new ActionError("Onaylanmış toplantı tutanağı düzenlenemez. Önce yeniden açın.");
}

/**
 * assertMeetingEditable (5. bölüm md. 4): her action BUNU çağırır; UI gizleme
 * yeterli değildir. Kapsama göre durum kuralları:
 * - content: yalnızca PLANNED veya HELD
 * - actionStatus: her durumda (yumuşak silinmiş hariç — silinmiş bulunamaz sayılır)
 * - files (yükleme): her durumda; onaylı toplantıya imzalı tutanak taranabilir
 * - fileDelete: APPROVED ise yalnızca delete yetkisi (ADMIN); değilse update
 */
export function assertMeetingEditable(
  meeting: Pick<Meeting, "status" | "deletedAt">,
  scope: EditScope,
  role: Role,
  definition: PermissionDefinition,
): void {
  if (meeting.deletedAt) {
    throw new ActionError("Toplantı bulunamadı.");
  }

  switch (scope) {
    case "content":
      if (meeting.status !== "PLANNED" && meeting.status !== "HELD") {
        throw lockedMeetingError();
      }
      return;
    case "actionStatus":
    case "files":
      return;
    case "fileDelete":
      if (meeting.status === "APPROVED" && !can(role, definition, "delete")) {
        throw new ActionError("Onaylanmış toplantının dosyasını yalnızca yönetici silebilir.");
      }
      return;
  }
}

/**
 * assertTransitionAllowed (5. bölüm md. 3): geçiş haritasında olmayan her geçiş
 * reddedilir; izin gereksinimi haritadan okunur ve denetlenir.
 */
export function assertTransitionAllowed(
  from: MeetingStatus,
  to: MeetingStatus,
  role: Role,
  definition: PermissionDefinition,
): "update" | "approve" {
  const required = MEETING_STATUS_TRANSITIONS[from]?.[to];
  if (!required) {
    throw new ActionError("Bu durum değişikliğine izin verilmiyor.");
  }
  if (!can(role, definition, required)) {
    throw new ActionError("Bu işlem için yetkiniz yok.");
  }
  return required;
}
