export const PRIVACY_PRESET_IDS = ["Strict", "Standard", "Connected"] as const;
export type PrivacyPresetId = (typeof PRIVACY_PRESET_IDS)[number];

export type AiProviderKey = "local" | "mistral" | "anthropic" | "openai";

export type PrivacyPresetDefinition = {
  id: PrivacyPresetId;
  labelKey: string;
  descriptionKey: string;
  /** Whether a self-hosted AI endpoint ("local") is strongly recommended/enforced. */
  selfHostedRecommended: boolean;
  recommendedAiProvider: AiProviderKey;
  allowedAiProviders: readonly AiProviderKey[];
  /** Target enabled/disabled state for external-egress extension modules. */
  modules: Readonly<Record<string, boolean>>;
};

/**
 * Privacy presets defined as pure data (B001 F2a).
 * Switching presets coherently configures extension modules and AI provider policy.
 */
export const PRIVACY_PRESETS: Readonly<Record<PrivacyPresetId, PrivacyPresetDefinition>> = {
  Strict: {
    id: "Strict",
    labelKey: "system.privacy.presets.strict.label",
    descriptionKey: "system.privacy.presets.strict.description",
    selfHostedRecommended: true,
    recommendedAiProvider: "local",
    allowedAiProviders: ["local"],
    modules: {
      ai: false,
      banking: false,
      "calendar-apple": false,
      "calendar-google": false,
      "calendar-outlook": false,
      "campaign-sms": false,
      "campaign-telegram": false,
      "campaign-whatsapp": false,
      finance: false,
      weather: false,
    },
  },
  Standard: {
    id: "Standard",
    labelKey: "system.privacy.presets.standard.label",
    descriptionKey: "system.privacy.presets.standard.description",
    selfHostedRecommended: false,
    recommendedAiProvider: "mistral",
    allowedAiProviders: ["local", "mistral"],
    modules: {
      ai: true,
      banking: true,
      "calendar-apple": false,
      "calendar-google": false,
      "calendar-outlook": false,
      "campaign-sms": false,
      "campaign-telegram": false,
      "campaign-whatsapp": false,
      finance: true,
      weather: true,
    },
  },
  Connected: {
    id: "Connected",
    labelKey: "system.privacy.presets.connected.label",
    descriptionKey: "system.privacy.presets.connected.description",
    selfHostedRecommended: false,
    recommendedAiProvider: "anthropic",
    allowedAiProviders: ["local", "mistral", "anthropic", "openai"],
    modules: {
      ai: true,
      banking: true,
      "calendar-apple": true,
      "calendar-google": true,
      "calendar-outlook": true,
      "campaign-sms": true,
      "campaign-telegram": true,
      "campaign-whatsapp": true,
      finance: true,
      weather: true,
    },
  },
};

export type PresetModuleDiffItem = {
  moduleKey: string;
  currentEnabled: boolean;
  targetEnabled: boolean;
  changed: boolean;
};

export type PresetAiDiff = {
  recommendedProvider: AiProviderKey;
  selfHostedRecommended: boolean;
  allowedProviders: readonly AiProviderKey[];
  currentlyConfiguredCloudProviders: readonly AiProviderKey[];
  disallowedConfiguredProviders: readonly AiProviderKey[];
  selfHostedConfigured: boolean;
  requiresSelfHostedSetup: boolean;
};

export type PrivacyPresetPreview = {
  presetId: PrivacyPresetId;
  currentPresetId: PrivacyPresetId | null;
  moduleChanges: PresetModuleDiffItem[];
  changedModuleCount: number;
  aiChanges: PresetAiDiff;
  hasChanges: boolean;
};

/**
 * Pure diff computation for previewing a privacy preset before admin approval.
 */
export function computePrivacyPresetDiff(input: {
  presetId: PrivacyPresetId;
  currentPresetId: PrivacyPresetId | null;
  currentModuleStates: Readonly<Record<string, boolean>>;
  configuredAiProviders: readonly AiProviderKey[];
}): PrivacyPresetPreview {
  const preset = PRIVACY_PRESETS[input.presetId];
  const moduleChanges: PresetModuleDiffItem[] = Object.entries(preset.modules)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([moduleKey, targetEnabled]) => {
      const currentEnabled = input.currentModuleStates[moduleKey] ?? false;
      return {
        moduleKey,
        currentEnabled,
        targetEnabled,
        changed: currentEnabled !== targetEnabled,
      };
    });

  const changedModuleCount = moduleChanges.filter((item) => item.changed).length;
  const allowedSet = new Set<AiProviderKey>(preset.allowedAiProviders);
  const cloudConfigured = input.configuredAiProviders.filter((p) => p !== "local");
  const disallowedConfiguredProviders = input.configuredAiProviders.filter((p) => !allowedSet.has(p));
  const selfHostedConfigured = input.configuredAiProviders.includes("local");

  const aiChanges: PresetAiDiff = {
    recommendedProvider: preset.recommendedAiProvider,
    selfHostedRecommended: preset.selfHostedRecommended,
    allowedProviders: preset.allowedAiProviders,
    currentlyConfiguredCloudProviders: cloudConfigured,
    disallowedConfiguredProviders,
    selfHostedConfigured,
    requiresSelfHostedSetup: preset.selfHostedRecommended && !selfHostedConfigured,
  };

  return {
    presetId: preset.id,
    currentPresetId: input.currentPresetId,
    moduleChanges,
    changedModuleCount,
    aiChanges,
    hasChanges:
      changedModuleCount > 0 ||
      input.currentPresetId !== preset.id ||
      disallowedConfiguredProviders.length > 0,
  };
}
