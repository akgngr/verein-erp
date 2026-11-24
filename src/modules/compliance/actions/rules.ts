"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import { createTaskFromApprovedProposal } from "@/modules/tasks/automation";
import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";

import { compliancePermissions } from "../permissions";
import { COMPLIANCE_RULES } from "../rules";

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
