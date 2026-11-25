import "server-only";

import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { getDb } from "@/shared/db";
import type { UserNavConfig } from "@/shared/navigation/user-nav";

const groupSchema = z.object({
  id: z.string().min(1).max(60),
  label: z.string().trim().min(1).max(60),
  order: z.number().int().min(-1000).max(10000),
  icon: z.string().min(1).max(40).optional(),
  collapsedByDefault: z.boolean().optional(),
  isCustom: z.boolean().optional(),
});

const itemOverrideSchema = z.object({
  categoryId: z.string().min(1).max(60).optional(),
  parentModule: z.string().min(1).max(60).nullable().optional(),
  order: z.number().int().min(-1000).max(10000).optional(),
  hidden: z.boolean().optional(),
});

export const userNavConfigSchema = z.object({
  groups: z.array(groupSchema).max(30).optional(),
  items: z.record(z.string().min(1).max(60), itemOverrideSchema).optional(),
  collapsedGroupIds: z.array(z.string().min(1).max(60)).max(30).optional(),
});

export async function getUserNavPreference(userId: string): Promise<UserNavConfig | null> {
  const db = getDb();
  const row = await db.userNavPreference.findUnique({
    where: { userId },
    select: { config: true },
  });
  if (!row) return null;
  const parsed = userNavConfigSchema.safeParse(row.config);
  return parsed.success ? parsed.data : null;
}

export async function saveUserNavPreference(
  userId: string,
  rawConfig: unknown,
): Promise<{ ok: true; config: UserNavConfig } | { ok: false }> {
  const parsed = userNavConfigSchema.safeParse(rawConfig);
  if (!parsed.success) return { ok: false };

  const db = getDb();
  await db.userNavPreference.upsert({
    where: { userId },
    create: { userId, config: parsed.data as Prisma.InputJsonValue },
    update: { config: parsed.data as Prisma.InputJsonValue },
  });

  return { ok: true, config: parsed.data };
}

export async function resetUserNavPreference(userId: string): Promise<void> {
  const db = getDb();
  await db.userNavPreference.deleteMany({ where: { userId } });
}
