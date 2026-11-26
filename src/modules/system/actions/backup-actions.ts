"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAction } from "@/modules/auth/server";
import { systemPermissions } from "@/shared/permissions/system";
import { buildUserLabel } from "@/shared/utils";

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

export const getBackupOverviewAction = createAction<
  Record<string, never>,
  BackupOverview
>({
  permission: { definition: systemPermissions, action: "update" },
  schema: z.object({}).strict(),
  handler: async () => getBackupOverview(),
});

export const createBackupAction = createAction<
  Record<string, never>,
  { overview: BackupOverview; prunedCount: number }
>({
  permission: { definition: systemPermissions, action: "update" },
  schema: z.object({}).strict(),
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

export const verifyBackupAction = createAction<
  z.infer<typeof backupIdSchema>,
  { verification: BackupVerificationResult; overview: BackupOverview }
>({
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

export const deleteBackupAction = createAction<
  z.infer<typeof backupIdSchema>,
  BackupOverview
>({
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

export const saveBackupConfigAction = createAction<BackupConfig, BackupConfig>({
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
