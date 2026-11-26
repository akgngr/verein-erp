export const PROVIDERS = ["google", "microsoft-entra-id", "twitter", "facebook"] as const;
export type ProviderId = (typeof PROVIDERS)[number];
export const BASE_PATH = "/ayarlar/sosyal-giris";
