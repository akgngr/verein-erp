"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import { listUsableModuleKeys } from "@/modules/system/automation";
import { createTaskFromApprovedProposal } from "@/modules/tasks/automation";
import { permissionResources } from "@/permissions-registry";
import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";
import type { ActionResult } from "@/shared/types/action";

import { compliancePermissions } from "../permissions";
import { COMPLIANCE_RULES } from "../rules";
import { runCockpit } from "../services/run";

/**
 * #585: Görev oluşturma, görevler modülünün açık olmasını ve kullanıcının görev oluşturma iznini ister (önceden
 * yalnız uyum izni yeterliydi). İzin tanımı üretilmiş izin kaydından okunur; mevcut `tasks: write` erişim
 * bildirimine `read` eklenmez (yönetici yeniden onayı gerekmez).
 */
async function assertCanCreateTask(role: string): Promise<void> {
  if (!(await listUsableModuleKeys()).includes("tasks")) throw new ActionError("compliance.errors.tasksUnavailable");
  const definition = permissionResources.find((entry) => entry.moduleKey === "tasks")?.definitions.find((item) => item.resource === "tasks");
  if (!definition || !can(role, definition, "create")) throw new ActionError("compliance.errors.tasksForbidden");
}

const ruleId = z.string().regex(/^[a-z]+(\.[a-z0-9-]+)+$/);

/** Admin: disable or re-enable a rule with a reason (audited). Rule content can never be edited here. */
export async function setComplianceRuleStateAction(input: unknown): Promise<ActionResult<null>> {
  const run = createAction({
    permission: { definition: compliancePermissions, action: "update" },
    schema: z.object({ ruleId, disabled: z.boolean(), reason: z.string().trim().min(3).max(500) }).strict(),
    handler: async ({ input, audit }) => {
      if (!COMPLIANCE_RULES.some((rule) => rule.id === input.ruleId)) throw new ActionError("compliance.errors.unknownRule");
      await getDb().complianceRuleState.upsert({
        where: { ruleId: input.ruleId },
        create: { ruleId: input.ruleId, disabled: input.disabled, reason: input.reason },
        update: { disabled: input.disabled, reason: input.reason },
      });
      await audit({ action: input.disabled ? "COMPLIANCE_RULE_DISABLE" : "COMPLIANCE_RULE_ENABLE", entity: "ComplianceRule", entityId: input.ruleId, after: { reason: input.reason } });
      revalidatePath("/compliance");
      return null;
    },
  });
  return run(input);
}

/** Human-confirmed draft task from a persisted, triggered finding (never automatic). */
export async function createComplianceTaskAction(input: unknown): Promise<ActionResult<{ taskId: string }>> {
  const run = createAction({
    permission: { definition: compliancePermissions, action: "create" },
    schema: z.object({ ruleId, period: z.number().int().min(2000).max(2100), refKey: z.string().max(40).default(""), locale: z.enum(["tr", "de"]) }).strict(),
    handler: async ({ input, user, audit }) => {
      const rule = COMPLIANCE_RULES.find((candidate) => candidate.id === input.ruleId && candidate.review.status === "reviewed");
      if (!rule?.suggestedTask) throw new ActionError("compliance.errors.noTask");
      await assertCanCreateTask(user.role);
      // Bulgu bu anda yeniden değerlendirilir ve kaydedilir (sayfa görüntüleme artık yazmaz).
      await runCockpit(user, { year: input.period, persist: true, onlyRuleId: input.ruleId });
      const finding = await getDb().complianceFinding.findUnique({ where: { ruleId_period_refKey: { ruleId: input.ruleId, period: input.period, refKey: input.refKey } } });
      if (!finding || finding.status !== "triggered") throw new ActionError("compliance.errors.noFinding");
      const title = `${rule.suggestedTask.title[input.locale]} (${input.period}${input.refKey ? `, ${input.refKey}` : ""})`;
      const task = await createTaskFromApprovedProposal({ title, createdById: user.id, createdByLabel: user.name ?? user.email ?? "-" });
      await audit({ action: "COMPLIANCE_TASK", entity: "ComplianceFinding", entityId: finding.id, after: { taskId: task.id, ruleId: rule.id, ruleVersion: finding.ruleVersion } });
      return { taskId: task.id };
    },
  });
  return run(input);
}
