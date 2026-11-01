"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import { listUsableModuleKeys } from "@/modules/system/server";
import type { ActionResult } from "@/shared/types/action";

import { demoPermissions } from "../permissions";
import { clearDemoData, seedDemoData } from "../services/demo-data";

const empty = z.object({}).strict();

async function ensureActive() {
  if (!(await listUsableModuleKeys()).includes("demo")) throw new ActionError("demo.errors.inactive");
}

export async function seedDemoDataAction(input: unknown): Promise<ActionResult<{ total: number; failed: string[] }>> {
  const run = createAction({
    permission: { definition: demoPermissions, action: "create" },
    schema: empty,
    handler: async ({ user, audit }) => {
      await ensureActive();
      const result = await seedDemoData({ id: user.id, label: user.name ?? user.email ?? user.id });
      const total = result.created.reduce((sum, row) => sum + row.count, 0);
      if (total === 0 && result.failed.length === 0) throw new ActionError("demo.errors.alreadySeeded");
      // KVKK: denetim kaydına yalnızca sayılar yazılır.
      await audit({ action: "CREATE", entity: "DemoData", after: { total, modules: result.created.map((row) => row.moduleKey) } });
      revalidatePath("/", "layout");
      return { total, failed: result.failed };
    },
  });
  return run(input ?? {});
}

export async function clearDemoDataAction(input: unknown): Promise<ActionResult<{ removed: number; remaining: number }>> {
  const run = createAction({
    permission: { definition: demoPermissions, action: "delete" },
    schema: empty,
    handler: async ({ audit }) => {
      const result = await clearDemoData();
      await audit({ action: "DELETE", entity: "DemoData", after: result });
      revalidatePath("/", "layout");
      return result;
    },
  });
  return run(input ?? {});
}
