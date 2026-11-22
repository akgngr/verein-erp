"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import type { ActionResult } from "@/shared/types/action";
import { widgetRegistry } from "@/widget-registry";

import { widgetsPermissions } from "../permissions";
import { MAX_ORDER, MAX_PREFERENCES } from "../services/preferences";
import { resetUserPreferences, saveUserPreferences, setPolicy } from "../services/store";

const preferencesSchema = z.object({
  preferences: z.array(z.object({ id: z.string().regex(/^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/), enabled: z.boolean(), order: z.number().int().min(0).max(MAX_ORDER) }).strict()).max(MAX_PREFERENCES),
}).strict();

/** Kullanıcı kendi widget görünürlük/sıra tercihini kaydeder (yalnız kendi satırları). */
export async function saveWidgetPreferencesAction(input: unknown): Promise<ActionResult<{ saved: number }>> {
  const run = createAction({
    permission: { definition: widgetsPermissions, action: "view" },
    schema: preferencesSchema,
    handler: async ({ input, user }) => {
      const saved = await saveUserPreferences(user.id, input.preferences, widgetRegistry);
      revalidatePath("/", "layout");
      return { saved: saved.length };
    },
  });
  return run(input);
}

export async function resetWidgetPreferencesAction(input: unknown): Promise<ActionResult<null>> {
  const run = createAction({
    permission: { definition: widgetsPermissions, action: "view" },
    schema: z.object({}).strict(),
    handler: async ({ user }) => {
      await resetUserPreferences(user.id);
      revalidatePath("/", "layout");
      return null;
    },
  });
  return run(input);
}

/** Yönetici: isteğe bağlı bir widget'ı herkes için kapatır/açar. Zorunlu widget'a uygulanamaz. */
export async function setWidgetPolicyAction(input: unknown): Promise<ActionResult<null>> {
  const run = createAction({
    permission: { definition: widgetsPermissions, action: "update" },
    schema: z.object({ widgetId: z.string().regex(/^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/), disabled: z.boolean() }).strict(),
    handler: async ({ input, audit }) => {
      if (!(await setPolicy(input.widgetId, input.disabled, widgetRegistry))) throw new ActionError("widgets.errors.policyNotAllowed");
      revalidatePath("/", "layout");
      await audit({ action: "WIDGET_POLICY", entity: "WidgetPolicy", entityId: input.widgetId, after: { disabled: input.disabled } });
      return null;
    },
  });
  return run(input);
}
