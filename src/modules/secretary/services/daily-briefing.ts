import { can } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";
import type { Briefing } from "@/shared/secretary/define";

import { secretaryPermissions } from "../permissions";
import { type BriefingPreference, dueBriefingDate } from "./schedule";

export type ScheduledPreference = BriefingPreference & { userId: string; channels: string[] };
export type BriefingRecipient = { id: string; role: Role; isActive: boolean };
/** Teslime giden özet: yalnız sayılar (kişisel veri yok). */
export type BriefingDigest = { date: string; total: number; danger: number; warning: number };

export type DailyBriefingDeps = {
  listPreferences: () => Promise<ScheduledPreference[]>;
  /** Aynı yerel gün için tek seferlik sahiplenme (koşullu güncelleme). true: bu çalışma sahiplendi. */
  claim: (userId: string, date: string) => Promise<boolean>;
  loadUser: (userId: string) => Promise<BriefingRecipient | null>;
  buildBriefing: (user: { id: string; role: Role }, now: Date) => Promise<Briefing>;
  /** Kanal teslimi. "in_app" sayfada canlı hesaplanır; dış kanal yoksa çağrılmaz. */
  deliver?: (user: BriefingRecipient, channel: string, digest: BriefingDigest) => Promise<void>;
};

export type DailyBriefingResult = { checked: number; due: number; produced: number; skipped: number };

const EXTERNAL_CHANNELS = new Set(["email"]);

export function digestOf(briefing: Briefing, date: string): BriefingDigest {
  const items = briefing.sections.flatMap((section) => section.items);
  return {
    date,
    total: items.length,
    danger: items.filter((item) => item.severity === "danger").length,
    warning: items.filter((item) => item.severity === "warning").length,
  };
}

/**
 * Zamanı gelen kullanıcılar için günlük özet. Sırası: zamanlama → aynı gün sahiplenme (idempotent) →
 * çalışma anında kullanıcı ve yetki yeniden denetimi → özet → dış kanallara teslim.
 * Bir kullanıcıdaki hata diğerlerini durdurmaz.
 */
export async function runDailyBriefings(now: Date, deps: DailyBriefingDeps): Promise<DailyBriefingResult> {
  const result: DailyBriefingResult = { checked: 0, due: 0, produced: 0, skipped: 0 };
  for (const preference of await deps.listPreferences()) {
    result.checked += 1;
    const date = dueBriefingDate(preference, now);
    if (!date) continue;
    result.due += 1;
    try {
      if (!(await deps.claim(preference.userId, date))) {
        result.skipped += 1;
        continue;
      }
      const channels = preference.channels.filter((channel) => EXTERNAL_CHANNELS.has(channel));
      if (channels.length === 0 || !deps.deliver) continue;
      const user = await deps.loadUser(preference.userId);
      if (!user || !user.isActive || !can(user.role, secretaryPermissions, "view")) {
        result.skipped += 1;
        continue;
      }
      const digest = digestOf(await deps.buildBriefing({ id: user.id, role: user.role }, now), date);
      for (const channel of channels) await deps.deliver(user, channel, digest);
      result.produced += 1;
    } catch {
      result.skipped += 1;
    }
  }
  return result;
}
