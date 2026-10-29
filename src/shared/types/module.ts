import type { LucideIcon } from "lucide-react";

import type { PermissionAction, PermissionDefinition } from "../permissions/define";

export type ModuleCategory = "CORE" | "OFFICIAL" | "EXTENSION";

export type NavItem = {
  href: string;
  label: string;
  /** i18n anahtarı (Faz 4): messages/*.json'da nav.<key> olarak çözülür. */
  labelKey?: string;
  icon: LucideIcon;
  group: "main" | "settings";
  order: number;
  permission: PermissionRequirement;
};

export type PermissionRequirement = { definition: PermissionDefinition; action: PermissionAction };

/**
 * Modül menüsü öğesi (sol panel, modül görünümü).
 *
 * KARAR: Menü TypeScript'te tanımlanır (eski menu/top.json yerine): ikon doğrudan Lucide
 * bileşenidir ve her öğe, hedef sayfanın gerçekten kontrol ettiği yetkiyi taşır. Böylece
 * yetkisi olmayan kullanıcı açamayacağı bağlantıyı görmez.
 */
export type ModuleMenuItem = {
  key: string;
  /** Çeviri bulunamazsa gösterilen etiket. */
  label: string;
  /** Modülün çeviri ad alanında çözülür: <modül anahtarı>.<labelKey>. */
  labelKey?: string;
  /** Sayfa yolu; sorgu içerebilir (örn. "/events?timeFilter=upcoming"). */
  href: string;
  icon: LucideIcon;
  /** Hedef sayfanın kontrol ettiği yetki. Verilmezse modülün ana menü (nav[0]) yetkisi kullanılır. */
  permission?: PermissionRequirement;
  /** true ise dosya indirme bağlantısıdır (API rotası); istemci yönlendirmesi yapılmaz. */
  isDownload?: boolean;
};

export type ModuleConfig = {
  key: string;
  label: string;
  description?: string;
  version?: string;
  author?: string;
  category: ModuleCategory;
  /** CORE modüller için true (pasife alınamaz, silinemez). */
  isProtected?: boolean;
  hasSchema?: boolean;
  /**
   * Modül sayfalarının bağlandığı rota kökü (örn. "/profil"). Verilmezse ilk nav `href`'i
   * kullanılır; menüde görünmeyen (nav'ı olmayan) modüllerin sayfaları için gereklidir.
   */
  basePath?: string;
  nav: NavItem[];
  /**
   * Modül menüsü: tanımlıysa sol panelde modüle girildiğinde ana menünün yerini alır.
   * Modülün ana sayfası (nav[0]) "Genel bakış" olarak otomatik eklenir; burada tekrar edilmez.
   */
  menu?: ModuleMenuItem[];
};
