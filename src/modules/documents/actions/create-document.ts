"use server";

import { getDb } from "@/shared/db";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { DEFAULT_STATUS_BY_DIRECTION } from "../constants";
import { documentsPermissions } from "../permissions";
import { documentCreateSchema } from "../schemas/document";
import { allocateRegistryNumber, runWithRegistryRetry } from "../services/registry-number";
import { validateAssignee, validateCategory, validateReplyTo } from "../services/validate-relations";
import { berlinYear, parseDateOnly } from "../utils";

/**
 * Yeni evrak kaydı (5. bölüm md. 1): kayıt numarası ve sıra, yön+yıl bazında
 * sayacın atomik artırılmasıyla ÜRETİLİR; registeredAt otomatiktir (şimdi).
 * Numara sonradan değiştirilemez — şemada registryNumber alanı yoktur.
 */
export async function createDocumentAction(
  input: unknown,
): Promise<ActionResult<{ id: string; registryNumber: string }>> {
  const run = createAction({
    permission: { definition: documentsPermissions, action: "create" },
    schema: documentCreateSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();

      await validateCategory(input.categoryId);
      const assignee = await validateAssignee(input.assigneeId);
      await validateReplyTo(input.replyToId, input.direction);

      const documentDate = parseDateOnly(input.documentDate);
      if (!documentDate) {
        throw new ActionError("documents.errors.invalidDate", {
          documentDate: ["documents.validation.dateInvalid"],
        });
      }
      const dueDate = input.dueDate ? parseDateOnly(input.dueDate) : null;
      const status = input.status ?? DEFAULT_STATUS_BY_DIRECTION[input.direction];

      // KARAR: createdByLabel, AuditLog.userLabel ile aynı "Ad <e-posta>" biçimindedir;
      // sorumlu etiketi (assigneeLabel) ise seçicilerdeki gibi yalnızca addır.
      const createdByLabel = buildUserLabel(user.name, user.email);
      const registeredAt = new Date();
      const year = berlinYear(registeredAt);

      const created = await runWithRegistryRetry(() =>
        db.$transaction(async (tx) => {
          const { sequence, registryNumber } = await allocateRegistryNumber(
            tx,
            input.direction,
            year,
          );
          return tx.document.create({
            data: {
              direction: input.direction,
              year,
              sequence,
              registryNumber,
              registeredAt,
              documentDate,
              counterparty: input.counterparty,
              referenceNumber: input.referenceNumber,
              subject: input.subject,
              summary: input.summary,
              deliveryMethod: input.deliveryMethod,
              status,
              dueDate,
              categoryId: input.categoryId,
              assigneeId: assignee?.id ?? null,
              assigneeLabel: assignee?.label ?? null,
              replyToId: input.replyToId,
              createdById: user.id,
              createdByLabel,
              updatedById: user.id,
              updatedByLabel: createdByLabel,
            },
          });
        }),
      );

      await audit({
        action: "CREATE",
        entity: "Document",
        entityId: created.id,
        after: {
          registryNumber: created.registryNumber,
          direction: created.direction,
          counterparty: created.counterparty,
          subject: created.subject,
          status: created.status,
        },
      });

      return { id: created.id, registryNumber: created.registryNumber };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string; registryNumber: string }>>;
}
