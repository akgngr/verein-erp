import "server-only";

export { systemPermissions, settingsPermissions } from "./permissions";
export { getModulesList, type ModuleItem } from "./queries/get-modules";
export { deleteModuleAction } from "./actions/delete-module";
export { syncSchemasAction } from "./actions/sync-schemas-action";
export { toggleModuleAction } from "./actions/toggle-module";
export { getModuleAvailability, listUsableModuleKeys, withModuleGate, gateRouteHandler, type ModuleAvailability } from "./services/module-gate";
export { approveModuleAccessAction, revokeModuleAccessAction } from "./actions/module-access";
export { uploadPackageHandler } from "./services/package-handlers";
export { deleteModulePackageAction } from "./actions/package-actions";
export { runMemberDeletionHooks, runUserDeletionHooks } from "./services/module-state-store";
export {
  getModuleReadinessReport,
  computeModuleReadiness,
  redactErrorCategory,
  type ModuleReadinessReport,
  type ModuleReadinessItem,
} from "./services/readiness";
export { getModuleReadinessAction } from "./actions/get-readiness";
export {
  getMonthlyEgressReportAction,
  previewPrivacyPresetAction,
  applyPrivacyPresetAction,
} from "./actions/egress-actions";
export {
  getMonthlyEgressReport,
  buildMonthlyEgressReport,
  resolveMonthWindow,
  PROVIDER_RETENTION_POLICIES,
  type MonthlyEgressReport,
  type EgressTransferSummaryRow,
  type EgressModuleConfigItem,
  type EgressRetentionReportItem,
  type ProviderRetentionPolicy,
} from "./services/egress-report";
export {
  PRIVACY_PRESETS,
  PRIVACY_PRESET_IDS,
  PRIVACY_PRESET_SETTING_KEY,
  PRIVACY_AI_ALLOWED_SETTING_KEY,
  computePrivacyPresetDiff,
  getActivePrivacyPreset,
  previewPrivacyPreset,
  applyPrivacyPreset,
  type PrivacyPresetId,
  type PrivacyPresetDefinition,
  type PrivacyPresetPreview,
  type ApplyPrivacyPresetResult,
} from "./services/privacy-presets";
export { hasLicensedFeature } from "./services/license-store";
export {
  downloadBackupHandler,
  verifyUploadedBackupHandler,
} from "./services/backup-handlers";
export {
  getBackupOverview,
  getBackupConfig,
  saveBackupConfig,
  createSystemBackup,
  verifySystemBackup,
  verifyUploadedSystemBackup,
  deleteSystemBackup,
  runScheduledBackupIfDue,
  type BackupConfig,
  type BackupOverview,
  type BackupRecordItem,
} from "./services/backups";
export {
  packAndEncryptBackup,
  decryptAndVerifyBackupArchive,
  isSafeBackupRelativePath,
  compareSchemaVersions,
  type BackupManifest,
  type BackupVerificationResult,
} from "./services/backup-bundle";
