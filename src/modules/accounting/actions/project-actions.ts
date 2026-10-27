"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { accountingSetupPermissions } from "../permissions";
import { projectCreateSchema, projectUpdateSchema } from "../schemas/project";

/** Proje oluştur (§ 8 md. 13): ad benzersiz. */
export async function createProjectAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: accountingSetupPermissions, action: "create" },
    schema: projectCreateSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      try {
        const created = await db.accountingProject.create({
          data: { name: input.name, note: input.note ?? null },
        });
        await audit({
          action: "CREATE",
          entity: "AccountingProject",
          entityId: created.id,
          after: { name: created.name },
        });
        return { id: created.id };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new ActionError("Bu proje adı zaten kullanılıyor.", {
            name: ["Farklı bir proje adı girin."],
          });
        }
        throw error;
      }
    },
  });

  return run(input) as Promise<ActionResult<{ id: string }>>;
}

const projectEditSchema = z.object({
  id: z.string().min(1),
  name: projectUpdateSchema.shape.name,
  note: projectUpdateSchema.shape.note,
  isActive: projectUpdateSchema.shape.isActive,
});

/** Proje güncelleme (§ 8 md. 13): silme yok — pasifleştirme. */
export async function updateProjectAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: accountingSetupPermissions, action: "update" },
    schema: projectEditSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const existing = await db.accountingProject.findUnique({ where: { id: input.id } });
      if (!existing) throw new ActionError("Proje bulunamadı.");

      await db.accountingProject.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          note: input.note ?? null,
          isActive: input.isActive ?? existing.isActive,
        },
      });

      await audit({
        action:
          input.isActive === false
            ? "DEACTIVATE"
            : input.isActive === true
              ? "ACTIVATE"
              : "UPDATE",
        entity: "AccountingProject",
        entityId: existing.id,
        before: { name: existing.name, isActive: existing.isActive },
        after: { name: input.name, isActive: input.isActive ?? existing.isActive },
      });
      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}
