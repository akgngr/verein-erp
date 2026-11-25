"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import type { ActionResult } from "@/shared/types/action";

import { automationPermissions } from "../permissions";
import { normalizeAutomationLocale } from "../services/automation-locale";
import { buildEditorCatalog } from "../services/workflow-catalog";
import { describeIssues } from "../services/workflow-describe";
import {
  checkWorkflowDraft,
  createWorkflow,
  decideApproval,
  deleteWorkflow,
  getWorkflow,
  publishWorkflow,
  renameWorkflow,
  saveWorkflowDraft,
  setWorkflowEnabled,
  startWorkflow,
  WorkflowPublishError,
} from "../services/workflows";

const id = z.string().min(1).max(128);
/** Editor JSON is opaque here; the compiler validates it before anything runs. */
const draft = z.unknown();

const ERRORS: Record<string, string> = {
  WORKFLOW_NOT_FOUND: "automation.workflows.errors.notFound",
  WORKFLOW_TOO_LARGE: "automation.workflows.errors.tooLarge",
  WORKFLOW_NOT_PUBLISHED: "automation.workflows.errors.notPublished",
  WORKFLOW_NOT_ACTIVE: "automation.workflows.errors.notActive",
  WORKFLOW_NOT_MANUAL: "automation.workflows.errors.notManual",
  WORKFLOW_PAYLOAD_TOO_LARGE: "automation.workflows.errors.tooLarge",
  APPROVAL_NOT_FOUND: "automation.workflows.errors.approvalNotFound",
  APPROVAL_ALREADY_DECIDED: "automation.workflows.errors.approvalDecided",
  AUTOMATION_MODULE_UNAVAILABLE: "automation.errors.moduleUnavailable",
};

function mapError(error: unknown): never {
  if (error instanceof WorkflowPublishError) throw new ActionError("automation.workflows.errors.invalid");
  const code = error instanceof Error ? error.message : "";
  if (ERRORS[code]) throw new ActionError(ERRORS[code]);
  throw error;
}

/**
 * #582: Her işlem denetim kaydı bırakır. Akış tanımı (draft), açıklama ve tetik girdisi denetime yazılmaz;
 * yalnız kimlik, ad, sürüm ve durum.
 */
const revalidate = (workflowId?: string) => {
  revalidatePath("/automation/workflows");
  if (workflowId) revalidatePath(`/automation/workflows/${workflowId}`);
};

export async function createWorkflowAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return createAction({
    permission: { definition: automationPermissions, action: "create" },
    schema: z.object({ name: z.string().trim().min(2, "automation.workflows.errors.name").max(120), description: z.string().trim().max(500).optional() }),
    handler: async ({ input, user, audit }) => {
      const created = await createWorkflow({ ...input, actorId: user.id });
      await audit({ action: "CREATE", entity: "AutomationWorkflow", entityId: created.id, after: { name: input.name } });
      revalidate();
      return created;
    },
  })(input);
}

export async function saveWorkflowDraftAction(input: unknown): Promise<ActionResult<{ issues: string[] }>> {
  return createAction({
    permission: { definition: automationPermissions, action: "update" },
    schema: z.object({ id, draft }),
    handler: async ({ input, user, audit }) => {
      await saveWorkflowDraft(input.id, input.draft, user.id).catch(mapError);
      await audit({ action: "UPDATE", entity: "AutomationWorkflow", entityId: input.id, after: { draftSaved: true } });
      revalidate(input.id);
      return { issues: await describeIssues(checkWorkflowDraft(input.draft).issues, input.draft, await buildEditorCatalog()) };
    },
  })(input);
}

export async function renameWorkflowAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  return createAction({
    permission: { definition: automationPermissions, action: "update" },
    schema: z.object({ id, name: z.string().trim().min(2).max(120), description: z.string().trim().max(500).default("") }),
    handler: async ({ input, user, audit }) => {
      if ((await renameWorkflow(input.id, input.name, input.description, user.id)) === 0) {
        throw new ActionError("automation.workflows.errors.notFound");
      }
      await audit({ action: "UPDATE", entity: "AutomationWorkflow", entityId: input.id, after: { name: input.name } });
      revalidate(input.id);
      return { ok: true as const };
    },
  })(input);
}

export async function publishWorkflowAction(input: unknown): Promise<ActionResult<{ version: number; issues: string[] }>> {
  return createAction({
    permission: { definition: automationPermissions, action: "approve" },
    schema: z.object({ id }),
    handler: async ({ input, user, audit }) => {
      try {
        const version = await publishWorkflow(input.id, user.id);
        await audit({ action: "APPROVE", entity: "AutomationWorkflow", entityId: input.id, after: { publishedVersion: version.version } });
        revalidate(input.id);
        return { version: version.version, issues: [] };
      } catch (error) {
        if (error instanceof WorkflowPublishError) {
          const workflow = await getWorkflow(input.id);
          return { version: 0, issues: await describeIssues(error.issues, workflow?.draft, await buildEditorCatalog()) };
        }
        return mapError(error);
      }
    },
  })(input);
}

export async function toggleWorkflowAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  return createAction({
    permission: { definition: automationPermissions, action: "approve" },
    schema: z.object({ id, enabled: z.boolean() }),
    handler: async ({ input, user, audit }) => {
      await setWorkflowEnabled(input.id, input.enabled, user.id).catch(mapError);
      await audit({ action: input.enabled ? "ACTIVATE" : "DEACTIVATE", entity: "AutomationWorkflow", entityId: input.id, after: { enabled: input.enabled } });
      revalidate(input.id);
      return { ok: true as const };
    },
  })(input);
}

export async function deleteWorkflowAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  return createAction({
    permission: { definition: automationPermissions, action: "delete" },
    schema: z.object({ id }),
    handler: async ({ input, audit }) => {
      if ((await deleteWorkflow(input.id)) === 0) throw new ActionError("automation.workflows.errors.notFound");
      await audit({ action: "DELETE", entity: "AutomationWorkflow", entityId: input.id });
      revalidate();
      return { ok: true as const };
    },
  })(input);
}

export async function startWorkflowAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return createAction({
    permission: { definition: automationPermissions, action: "update" },
    schema: z.object({ id, input: z.string().max(32 * 1024).default("") }),
    handler: async ({ input, user, audit }) => {
      let payload: unknown = {};
      if (input.input.trim()) {
        try {
          payload = JSON.parse(input.input);
        } catch {
          throw new ActionError("automation.workflows.errors.inputJson");
        }
      }
      // Alt görevler (bildirim, e-posta, belge) akışı başlatan kullanıcının dilinde çalışır.
      const locale = normalizeAutomationLocale(await getLocale()) ?? undefined;
      const run = await startWorkflow(input.id, payload, { actorId: user.id, locale }).catch(mapError);
      await audit({ action: "CREATE", entity: "AutomationWorkflowRun", entityId: run.id, after: { workflowId: input.id } });
      revalidate(input.id);
      return run;
    },
  })(input);
}

export async function decideApprovalAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  return createAction({
    permission: { definition: automationPermissions, action: "approve" },
    schema: z.object({ stepId: id, approved: z.boolean() }),
    handler: async ({ input, user, audit }) => {
      await decideApproval(input.stepId, input.approved, user.id).catch(mapError);
      await audit({ action: "STATUS_CHANGE", entity: "AutomationApproval", entityId: input.stepId, after: { decision: input.approved ? "approved" : "rejected" } });
      revalidatePath("/automation");
      revalidate();
      return { ok: true as const };
    },
  })(input);
}
