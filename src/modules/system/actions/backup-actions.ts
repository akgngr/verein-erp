"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAction } from "@/modules/auth/server";
import { systemPermissions } from "@/shared/permissions/system";
import { buildUserLabel } from "@/shared/utils";

import type { ActionResult } from "@/shared/types/action";

import {
  backupConfigSchema,
  createSystemBackup,
  deleteSystemBackup,
  getBackupOverview,
  saveBackupConfig,
  verifySystemBackup,
  type BackupConfig,
  type BackupOverview,
} from "../services/backups";
import type { BackupVerificationResult } from "../services/backup-bundle";

const backupIdSchema = z.object({
  id: z.string().min(4).max(80),
});

const emptySchema = z.object({}).strict();

export async function getBackupOverviewAction(
  input: unknown,
): Promise<ActionResult<BackupOverview>> {
  const run = createAction({
    permission: { definition: systemPermissions, action: "update" },
    schema: emptySchema,
    handler: async () => getBackupOverview(),
  });
  return run(input);
}

export async function createBackupAction(
  input: unknown,
): Promise<ActionResult<{ overview: BackupOverview; prunedCount: number }>> {
  const run = createAction({
    permission: { definition: systemPermissions, action: "update" },
    schema: emptySchema,
    handler: async ({ user }) => {
      const { prunedCount } = await createSystemBackup({
        trigger: "manual",
        actor: { id: user.id, label: buildUserLabel(user.name, user.email) },
      });
      revalidatePath("/ayarlar/yedekleme");
      const overview = await getBackupOverview();
      return { overview, prunedCount };
    },
  });
  return run(input);
}

export async function verifyBackupAction(
  input: unknown,
): Promise<
  ActionResult<{ verification: BackupVerificationResult; overview: BackupOverview }>
> {
  const run = createAction({
    permission: { definition: systemPermissions, action: "update" },
    schema: backupIdSchema,
    handler: async ({ input, user }) => {
      const verification = await verifySystemBackup(input.id, {
        id: user.id,
        label: buildUserLabel(user.name, user.email),
      });
      revalidatePath("/ayarlar/yedekleme");
      const overview = await getBackupOverview();
      return { verification, overview };
    },
  });
  return run(input);
}

export async function deleteBackupAction(
  input: unknown,
): Promise<ActionResult<BackupOverview>> {
  const run = createAction({
    permission: { definition: systemPermissions, action: "delete" },
    schema: backupIdSchema,
    handler: async ({ input, user }) => {
      await deleteSystemBackup(input.id, {
        id: user.id,
        label: buildUserLabel(user.name, user.email),
      });
      revalidatePath("/ayarlar/yedekleme");
      return getBackupOverview();
    },
  });
  return run(input);
}

export async function saveBackupConfigAction(
  input: unknown,
): Promise<ActionResult<BackupConfig>> {
  const run = createAction({
    permission: { definition: systemPermissions, action: "update" },
    schema: backupConfigSchema,
    handler: async ({ input, user }) => {
      const saved = await saveBackupConfig(input, {
        id: user.id,
        label: buildUserLabel(user.name, user.email),
      });
      revalidatePath("/ayarlar/yedekleme");
      return saved;
    },
  });
  return run(input);
}
