import "server-only";

// system modülü — worker ve otomasyonlar için sunucu public girişi.
// Next.js / React UI bağımlılıklarını bu girişe taşımayın.
export { getModuleAvailability, listUsableModuleKeys, type ModuleAvailability } from "./services/module-availability";
// Gizlilik ön ayarının yapay zekâ sağlayıcı politikası (#583): ai modülü sağlayıcı seçiminde okur.
export { getAllowedAiProviders, isAiProviderAllowed } from "./services/privacy-policy";
