/** Değer listeleri (etiketler kodda değil messages/{tr,de}.json içindedir). */
export const SPONSOR_TIERS = ["PLATINUM", "GOLD", "SILVER", "BRONZE", "SUPPORTER"] as const;
export type SponsorTier = (typeof SPONSOR_TIERS)[number];

export const SPONSOR_STATUSES = ["LEAD", "ACTIVE", "PAUSED", "ENDED"] as const;
export type SponsorStatus = (typeof SPONSOR_STATUSES)[number];
