import "server-only";

import { ActionError } from "@/modules/auth/server";
import { listProviderStatus } from "@/modules/ai/server";
import { allModules } from "@/registry";
import { isAccessApproved } from "@/shared/modules/module-access";
import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";

import { getAccessRecords } from "./module-access-store";
import { getEffectiveModuleStates, setModuleEnabled } from "./module-state-store";
import { PRIVACY_AI_ALLOWED_SETTING_KEY } from "./privacy-policy";
import {
  computePrivacyPresetDiff,
  findPresetBlockers,
  PRIVACY_PRESET_IDS,
  PRIVACY_PRESETS,
  type AiProviderKey,
  type PrivacyPresetId,
  type PrivacyPresetPreview,
} from "./privacy-presets-core";

export * from "./privacy-presets-core";

export const PRIVACY_PRESET_SETTING_KEY = "privacy.preset";
export { PRIVACY_AI_ALLOWED_SETTING_KEY } from "./privacy-policy";

const PROTECTED_MODULE_KEYS = new Set(
  allModules.filter((mod) => mod.isProtected || mod.category === "CORE").map((mod) => mod.key),
);

function parsePresetId(value: string | null | undefined): PrivacyPresetId | null {
  if (!value) return null;
  return (PRIVACY_PRESET_IDS as readonly string[]).includes(value) ? (value as PrivacyPresetId) : null;
}

export async function getActivePrivacyPreset(): Promise<PrivacyPresetId | null> {
  const row = await getDb().systemSetting.findUnique({
    where: { key: PRIVACY_PRESET_SETTING_KEY },
    select: { value: true },
  });
  return parsePresetId(row?.value);
}

async function getConfiguredAiProviders(): Promise<AiProviderKey[]> {
  try {
    const statuses = await listProviderStatus();
    return statuses.filter((s) => s.ready).map((s) => s.id as AiProviderKey);
  } catch {
    return [];
  }
}

/**
 * Generates a preview diff for applying a privacy preset without mutating any state.
 */
export async function previewPrivacyPreset(presetId: PrivacyPresetId): Promise<PrivacyPresetPreview> {
  const [currentPresetId, effectiveStates, configuredAiProviders, accessRecords] = await Promise.all([
    getActivePrivacyPreset(),
    getEffectiveModuleStates(),
    getConfiguredAiProviders(),
    getAccessRecords(),
  ]);

  const currentModuleStates: Record<string, boolean> = {};
  for (const mod of allModules) {
    currentModuleStates[mod.key] = effectiveStates[mod.key] ?? false;
  }

  const diff = computePrivacyPresetDiff({
    presetId,
    currentPresetId,
    currentModuleStates,
    configuredAiProviders,
  });
  const blockers = findPresetBlockers({
    moduleChanges: diff.moduleChanges,
    modules: allModules,
    currentEnabled: (key) => currentModuleStates[key] ?? false,
    protectedKeys: PROTECTED_MODULE_KEYS,
    accessApproved: (key) => {
      const mod = allModules.find((item) => item.key === key);
      return Boolean(mod && isAccessApproved(mod, accessRecords[key]));
    },
  });
  return { ...diff, blockers };
}

export type ApplyPrivacyPresetResult = {
  applied: true;
  presetId: PrivacyPresetId;
  diff: PrivacyPresetPreview;
};

/**
 * Applies a privacy preset after admin approval: updates extension module states,
 * records the active preset & AI provider policy in SystemSetting, and writes an audit entry.
 */
export async function applyPrivacyPreset(
  presetId: PrivacyPresetId,
  actor: { userId: string; userLabel: string },
): Promise<ApplyPrivacyPresetResult> {
  const diff = await previewPrivacyPreset(presetId);
  const preset = PRIVACY_PRESETS[presetId];
  // #583: Bağımlılığı eksik, izni onaysız veya bağımlısı açık kalacak bir modül değişikliği yarım uygulanmaz.
  if (diff.blockers?.length) throw new ActionError("system.privacyUi.blocked");

  for (const change of diff.moduleChanges) {
    if (!change.changed) continue;
    if (PROTECTED_MODULE_KEYS.has(change.moduleKey)) continue;
    await setModuleEnabled(change.moduleKey, change.targetEnabled);
  }

  const db = getDb();
  await db.systemSetting.upsert({
    where: { key: PRIVACY_PRESET_SETTING_KEY },
    create: {
      key: PRIVACY_PRESET_SETTING_KEY,
      value: preset.id,
    },
    update: { value: preset.id },
  });

  await db.systemSetting.upsert({
    where: { key: PRIVACY_AI_ALLOWED_SETTING_KEY },
    create: {
      key: PRIVACY_AI_ALLOWED_SETTING_KEY,
      value: JSON.stringify(preset.allowedAiProviders),
    },
    update: { value: JSON.stringify(preset.allowedAiProviders) },
  });

  await writeAudit({
    userId: actor.userId,
    userLabel: actor.userLabel,
    action: "PRIVACY_PRESET_APPLY",
    entity: "SystemSetting",
    entityId: preset.id,
    before: { presetId: diff.currentPresetId },
    after: {
      presetId: preset.id,
      changedModules: diff.moduleChanges.filter((m) => m.changed),
      allowedAiProviders: preset.allowedAiProviders,
    },
  });

  return {
    applied: true,
    presetId: preset.id,
    diff,
  };
}
