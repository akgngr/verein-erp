import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import type { Role } from "../roles";
import type { PermissionRequirement } from "./module";

/** Panel ızgarasında kartın genişliği: sm = 1 sütun, md = 2 sütun, lg = tam satır (3 sütun). */
export type DashboardCardSize = "sm" | "md" | "lg";

export type DashboardCardContext = {
  user: { id: string; role: Role };
  /** Modülün çeviri ad alanında çevirir: t("cards.x.label") → <modül>.cards.x.label. */
  t: (key: string, values?: Record<string, string | number | Date>) => string;
};

/**
 * Modülün panele sunduğu kart (src/modules/<modül>/cards/index.ts → `cards`).
 * Kart çerçevesini (başlık, ikon, bağlantı, düzenleme) panel çizer; kart yalnızca gövdeyi döner.
 */
export type DashboardCardDefinition = {
  /** Modül içinde benzersiz; paneldeki kimlik "<modül>.<key>" olur. */
  key: string;
  /** Modül ad alanında başlık / açıklama anahtarları (örn. "cards.activeMembers.title"). */
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  size: DashboardCardSize;
  /** Kullanıcı paneli henüz düzenlemediyse gösterilir mi. */
  defaultVisible?: boolean;
  /** Başlığa tıklanınca gidilen sayfa. */
  href?: string;
  /** Kartı görmek için gereken yetki (verinin geldiği sayfanınki). */
  permission: PermissionRequirement;
  /**
   * Gövdeyi üretir (sunucuda; sorgu + `@/shared/components/dashboard/card-bodies` bileşenleri).
   * null dönerse kart o an gösterilecek bir şey olmadığı için gizlenir (örn. gecikme uyarısı).
   * Hata fırlatırsa yalnızca bu kart hata mesajı gösterir; panel çalışmaya devam eder.
   */
  render: (context: DashboardCardContext) => Promise<ReactNode | null>;
};

/** Tip denetimi için yardımcı: `export const cards = defineCards([...])`. */
export function defineCards(cards: DashboardCardDefinition[]): DashboardCardDefinition[] {
  return cards;
}
