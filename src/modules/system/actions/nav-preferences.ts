"use server";

import { requireUser } from "@/modules/auth/server";
import {
  resetUserNavPreference,
  saveUserNavPreference,
} from "@/modules/users/server";
import type { UserNavConfig } from "@/shared/navigation/user-nav";

export async function saveMyNavPreferenceAction(
  config: UserNavConfig,
): Promise<{ ok: true; config: UserNavConfig } | { ok: false }> {
  const user = await requireUser();
  return saveUserNavPreference(user.id, config);
}

export async function resetMyNavPreferenceAction(): Promise<{ ok: true }> {
  const user = await requireUser();
  await resetUserNavPreference(user.id);
  return { ok: true };
}
