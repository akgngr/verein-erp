import "server-only";

import { getDb } from "@/shared/db";

import type { Preferences } from "../schemas/preferences";
import { getPreferences, prismaPreferenceStore } from "./preferences";

/** Tercih ekranı (#262) için: yalnız oturumdaki kullanıcının tercihleri. */
export async function getMySecretaryPreferences(user: { id: string }): Promise<Preferences> {
  return getPreferences(prismaPreferenceStore(getDb()), user.id);
}
