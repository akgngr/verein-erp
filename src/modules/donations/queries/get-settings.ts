import "server-only";

import { getDb } from "@/shared/db";

import type { DonationsSettingsData } from "../types";

/** Şablon onay durumu (§ 14). */
export async function getDonationsSettings(): Promise<DonationsSettingsData> {
  const settings = await getDb().donationsSettings.findUnique({ where: { id: "singleton" } });
  return {
    templateConfirmedVersion: settings?.templateConfirmedVersion ?? null,
    templateConfirmedAt: settings?.templateConfirmedAt ?? null,
    templateConfirmedByLabel: settings?.templateConfirmedByLabel ?? null,
  };
}
