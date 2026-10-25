"use server";

import { writeAudit } from "@/shared/audit/write-audit";
import { buildUserLabel } from "@/shared/utils";

import { auth, signOut } from "../auth";

/** Çıkış: LOGOUT denetim kaydı yazılır, oturum kapatılır, /giris'e yönlendirilir. */
export async function signOutAction(): Promise<void> {
  const session = await auth();
  const user = session?.user;
  if (user?.id) {
    await writeAudit({
      userId: user.id,
      userLabel: buildUserLabel(user.name ?? "", user.email ?? ""),
      action: "LOGOUT",
      entity: "Auth",
    });
  }
  await signOut({ redirectTo: "/giris" });
}
