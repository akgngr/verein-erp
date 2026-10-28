import { accountingPermissions, accountingSetupPermissions } from "@/modules/accounting";
import { auditPermissions } from "@/modules/audit";
import { documentsPermissions, documentCategoriesPermissions } from "@/modules/documents";
import { donationsPermissions } from "@/modules/donations";
import { meetingsPermissions } from "@/modules/meetings";
import { membersPermissions, memberPaymentsPermissions, memberTypesPermissions } from "@/modules/members";
import { organizationPermissions } from "@/modules/organization";
import { systemPermissions, settingsPermissions } from "@/shared/permissions/system";
import type { PermissionAction, PermissionDefinition } from "@/shared/permissions/define";
import type { Role, ChipColor } from "@/shared/roles";

import { usersPermissions } from "./permissions";

export type PermissionResourceMeta = {
  moduleKey: string;
  moduleLabel: string;
  resourceKey: string;
  resourceLabel: string;
  description: string;
  definition: PermissionDefinition;
  supportedActions: PermissionAction[];
};

export type RoleMeta = {
  role: Role;
  label: string;
  shortDesc: string;
  legalContext: string;
  badgeColor: ChipColor;
};

export const ALL_ROLES_META: RoleMeta[] = [
  {
    role: "ADMIN",
    label: "Yönetici (Admin)",
    shortDesc: "Sistem, modül ve kullanıcı yönetimi dahil tam yetki.",
    legalContext: "Tüm modüllerde oluşturma, düzenleme, silme ve denetim yetkisine sahiptir.",
    badgeColor: "primary",
  },
  {
    role: "BOARD",
    label: "Yönetim Kurulu (Vorstand)",
    shortDesc: "Toplantı, karar, evrak ve dernek yönetimi ana yetkileri.",
    legalContext: "BGB § 26 uyarınca dernek temsil ve yürütme organıdır; mali detayları özet görür.",
    badgeColor: "secondary",
  },
  {
    role: "SECRETARY",
    label: "Sekreter (Schriftführer)",
    shortDesc: "Evrak kayıt, toplantı tutanakları ve üye kayıt operasyonları.",
    legalContext: "Yazışmalar, defterler ve karar defterlerinin tanziminden sorumludur.",
    badgeColor: "success",
  },
  {
    role: "TREASURER",
    label: "Sayman (Kassenwart)",
    shortDesc: "Çift taraflı muhasebe, fişler, bütçe, bağış makbuzları ve aidatlar.",
    legalContext: "Mali defterlerin tutulması ve vergi dairesi (Finanzamt) uyumluluğundan sorumludur.",
    badgeColor: "warning",
  },
  {
    role: "AUDITOR",
    label: "Denetçi (Kassenprüfer)",
    shortDesc: "Mali ve idari kayıtlara salt okunur denetim erişimi.",
    legalContext: "Yıllık mali denetim yapar; bağışçı kişisel verilerine erişemez.",
    badgeColor: "danger",
  },
  {
    role: "VIEWER",
    label: "Salt Okunur (Leser)",
    shortDesc: "Temel evrak ve toplantı bilgilerini inceleme yetkisi.",
    legalContext: "Veri değişikliği veya mali kayıtları inceleme yetkisi bulunmaz.",
    badgeColor: "default",
  },
];

export const ALL_RESOURCES_META: PermissionResourceMeta[] = [
  {
    moduleKey: "documents",
    moduleLabel: "Evrak Kayıt",
    resourceKey: "documents",
    resourceLabel: "Gelen / Giden Evraklar",
    description: "Resmi evrakların sisteme kaydedilmesi, numaralandırılması ve arşivlenmesi.",
    definition: documentsPermissions,
    supportedActions: ["view", "create", "update", "delete"],
  },
  {
    moduleKey: "documents",
    moduleLabel: "Evrak Kayıt",
    resourceKey: "documentCategories",
    resourceLabel: "Evrak Kategorileri",
    description: "Evrak kategorilerinin ve dosya planının yönetimi.",
    definition: documentCategoriesPermissions,
    supportedActions: ["view", "create", "update"],
  },
  {
    moduleKey: "meetings",
    moduleLabel: "Toplantılar",
    resourceKey: "meetings",
    resourceLabel: "Toplantı ve Kararlar",
    description: "Toplantı takvimi, gündem maddeleri, tutanaklar, kararlar ve onaylama.",
    definition: meetingsPermissions,
    supportedActions: ["view", "create", "update", "delete", "approve"],
  },
  {
    moduleKey: "members",
    moduleLabel: "Üyeler",
    resourceKey: "members",
    resourceLabel: "Üye Kayıtları",
    description: "Dernek üyelerinin profili, iletişim verileri ve üyelik durumları.",
    definition: membersPermissions,
    supportedActions: ["view", "create", "update", "delete"],
  },
  {
    moduleKey: "members",
    moduleLabel: "Üyeler",
    resourceKey: "memberPayments",
    resourceLabel: "Aidat ve Ödemeler",
    description: "Üye aidat tahakkukları, tahsilat ve ödeme takibi.",
    definition: memberPaymentsPermissions,
    supportedActions: ["view", "create", "update", "delete"],
  },
  {
    moduleKey: "members",
    moduleLabel: "Üyeler",
    resourceKey: "memberTypes",
    resourceLabel: "Üyelik Tipleri",
    description: "Asil, fahri, öğrenci vb. üyelik tipleri ve aidat baremleri.",
    definition: memberTypesPermissions,
    supportedActions: ["view", "create", "update"],
  },
  {
    moduleKey: "accounting",
    moduleLabel: "Muhasebe",
    resourceKey: "accounting",
    resourceLabel: "Yevmiye & Defterler",
    description: "Fişler, gelir-gider kayıtları, hesap planı ve dönem raporları.",
    definition: accountingPermissions,
    supportedActions: ["view", "create", "update", "delete", "approve"],
  },
  {
    moduleKey: "accounting",
    moduleLabel: "Muhasebe",
    resourceKey: "accountingSetup",
    resourceLabel: "Hesap Planı & Bütçe",
    description: "Hesap planı (SKR49/SKR42), bütçe öngörüleri ve mali ayarlar.",
    definition: accountingSetupPermissions,
    supportedActions: ["view", "create", "update"],
  },
  {
    moduleKey: "donations",
    moduleLabel: "Bağışlar",
    resourceKey: "donations",
    resourceLabel: "Bağış ve Makbuzlar",
    description: "Bağış tahsilatları ve resmi Zuwendungsbestätigung makbuz üretimi.",
    definition: donationsPermissions,
    supportedActions: ["view", "create", "update", "delete", "approve"],
  },
  {
    moduleKey: "organization",
    moduleLabel: "Dernek Profili",
    resourceKey: "organization",
    resourceLabel: "Dernek Ana Bilgileri",
    description: "Resmi dernek sicil no, vergi no, banka hesapları ve antet logosu.",
    definition: organizationPermissions,
    supportedActions: ["view", "update"],
  },
  {
    moduleKey: "users",
    moduleLabel: "Kullanıcılar",
    resourceKey: "users",
    resourceLabel: "Kullanıcı Hesapları",
    description: "Sistem kullanıcıları, oturum hesapları ve parola sıfırlama.",
    definition: usersPermissions,
    supportedActions: ["view", "create", "update"],
  },
  {
    moduleKey: "audit",
    moduleLabel: "Denetim Kaydı",
    resourceKey: "audit",
    resourceLabel: "Güvenlik & Değişiklik Günlüğü",
    description: "Değiştirilemez sistemsel denetim izleri ve güvenlik kayıtları.",
    definition: auditPermissions,
    supportedActions: ["view"],
  },
  {
    moduleKey: "system",
    moduleLabel: "Sistem & Modüller",
    resourceKey: "system",
    resourceLabel: "Modül Yönetimi",
    description: "Eklenti yükleme, modül aktifleştirme ve pasifleştirme.",
    definition: systemPermissions,
    supportedActions: ["view", "update", "delete"],
  },
  {
    moduleKey: "system",
    moduleLabel: "Sistem & Modüller",
    resourceKey: "settings",
    resourceLabel: "Sistem Ayarları",
    description: "Genel dernek sistemi ve platform parametreleri.",
    definition: settingsPermissions,
    supportedActions: ["view"],
  },
];
