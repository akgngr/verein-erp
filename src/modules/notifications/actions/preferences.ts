"use server";

import { createAction } from "@/modules/auth/server";
import { can } from "@/shared/permissions/define";
import type { ActionResult } from "@/shared/types/action";
import { z } from "zod";

import { notificationsPermissions } from "../permissions";
import { getPreferenceTable, getSettings, type NotificationSettingsInput, preferenceInputSchema, type PreferenceView, savePreferences, saveSettings, settingsInputSchema } from "../services/preferences";

const permission = { definition: notificationsPermissions, action: "view" as const };
const registry = async () => (await import("@/notification-registry")).moduleNotificationRegistry;

/** N2a (#357): tercih tablosu — yalnız kullanıcının rolüyle görebileceği türler. */
export async function getMyNotificationPreferencesAction(input: unknown): Promise<ActionResult<{ types: PreferenceView[]; settings: NotificationSettingsInput }>> {
  return createAction({
    permission,
    schema: z.object({}).strict(),
    handler: async ({ user }) => ({
      types: await getPreferenceTable(user.id, await registry(), (type) => can(user.role, type.permission.definition, type.permission.action)),
      settings: await getSettings(user.id),
    }),
  })(input ?? {});
}

export async function saveMyNotificationPreferencesAction(input: unknown): Promise<ActionResult<{ saved: number }>> {
  return createAction({
    permission,
    schema: preferenceInputSchema,
    handler: async ({ input, user, audit }) => {
      const saved = await savePreferences(user.id, input.changes, await registry());
      await audit({ action: "UPDATE", entity: "NotificationPreference", entityId: user.id, after: { changes: saved } });
      return { saved };
    },
  })(input);
}

export async function saveMyNotificationSettingsAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission,
    schema: settingsInputSchema,
    handler: async ({ input, user, audit }) => {
      await saveSettings(user.id, input);
      await audit({ action: "UPDATE", entity: "NotificationSettings", entityId: user.id, after: { digestMode: input.digestMode, quietHours: input.quietFrom !== null } });
      return null;
    },
  })(input);
}
