# Mimari, Dosya Anatomisi, Config, İzinler, Data Policy ve Sync Haritası

## 1. Tam Modül Klasör Yapısı

```text
src/modules/<anahtar>/
├── module.config.ts          # Zorunlu: kimlik, version, category, nav, menu, access, requires, recommends, roles, dependencies, license
├── releases.json             # Zorunlu: TR/DE sürüm notları (en yeni en üstte, module.config.ts version ile aynı)
├── permissions.ts            # Zorunlu: definePermissions(...) + 7 sistem rolü (+ ilgili modül rolleri)
├── nav.json                  # Ana menüde görünen modüller için: categoryGroup, parentModule?, order?
├── schema.prisma             # hasSchema: true ise zorunlu; EXTENSION tabloları @@map("<anahtar>_...")
├── types.ts                  # İstemciye güvenle geçebilen satır/DTO tipleri
├── constants.ts              # Yalnız değer dizileri (etiketler kodda değil messages/*.json'da!)
├── index.ts                  # Zorunlu izomorfik public giriş (server-only YASAK!)
├── server.ts                 # Zorunlu sunucu public girişi (import "server-only";)
├── ui.ts                     # Zorunlu UI public girişi (view ve ortak bileşen exportları)
├── page.tsx                  # Modül ana sayfası → /<basePath veya ilk nav.href veya anahtar>
├── routes/<yol>/page.tsx     # Alt sayfalar → /<rota>/<yol> (dinamik [id] desteklenir)
├── api/<yol>/route.ts        # API rotaları → /api/<anahtar>/<yol> (export async function GET/POST/...)
├── public/<yol>/page.tsx     # Oturumsuz sayfalar → /<yol> (src/proxy.ts matcher muafiyeti gerekir!)
├── messages/
│   ├── tr.json               # Zorunlu: Türkçe metinler
│   └── de.json               # Zorunlu: gerçek Almanca metinler (tr.json ile birebir aynı yaprak anahtarlar)
├── schemas/                  # Zod doğrulama şemaları (hata mesajları çeviri anahtarı)
├── queries/                  # "server-only" salt-okunur Prisma sorguları + build<X>Where()
├── actions/                  # "use server" Server Actions (createAction + audit); toplu işlemler bulk-*.ts
├── services/                 # Çok adımlı iş mantığı, worker handler implementasyonları, export
├── helpers/                  # Saf, yan etkisiz hesaplama/dönüşüm fonksiyonları
├── components/               # "use client" etkileşimli UI bileşenleri (kit/fields/forms/DataTable)
├── views/                    # Sunucu orkestrasyon bileşenleri (requirePermission → queries → components)
│
│   ── İsteğe bağlı sıfır-dokunuş eklenti dosyaları (bkz. references/extension-points.md) ──
├── cards/index.tsx           # Panel & yüzey kartları → src/dashboard-cards.ts
├── ai.ts                     # Asistan v2 araçları & onay eylemleri → src/ai-registry.ts
├── automation.ts             # Arka plan görevleri (defineTask) & olaylar (defineEvent) → src/automation-registry.ts
├── lifecycle.ts              # onDisable / onUserDeleted (KVKK/DSGVO silinme hakkı) → src/lifecycle-registry.ts
├── demo.ts                   # Örnek veri üretici (defineDemo) → src/demo-registry.ts
├── widget.ts                 # İstemci-güvenli üst çubuk/slot widget'ları → src/widget-registry.ts
├── secretary.ts              # Kişisel sekreter sabah özeti katkısı → src/secretary-registry.ts
├── notifications.ts          # Merkezi bildirim türleri → src/notification-registry.ts
├── calendar.ts               # Takvim salt-okunur kaynakları → src/calendar-registry.ts
├── calendar-sync.ts          # Dış takvim senkron sağlayıcı → src/calendar-sync-registry.ts
├── channels.ts               # Kampanya gönderim kanalı → src/campaign-channel-registry.ts
├── recipients.ts             # Toplu e-posta alıcı kaynağı → src/recipient-registry.ts
├── formats.ts                # Export format eklentisi → src/format-registry.ts
├── compliance.ts             # Gemeinnützigkeit uyum metrikleri → src/compliance-registry.ts
└── auth-providers.ts         # OAuth/OIDC giriş sağlayıcı → src/auth-provider-registry.ts
```

---

## 2. `module.config.ts` & `nav.json` Sözleşmesi

Tipler: `src/shared/types/module.ts`.

```ts
import { Download, Package, Settings } from "lucide-react";
import type { ModuleConfig } from "@/shared/types/module";
import { sponsorsPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "sponsors",                       // Klasör adıyla BİREBİR aynı (/^[a-z0-9_-]+$/)
  version: "1.0.0",                      // releases.json[0].version ile BİREBİR aynı
  label: "Sponsorlar",                   // Yedek etiket (gerçek etiket messages → module.label)
  description: "Sponsor yönetimi.",      // Yedek açıklama (gerçek açıklama messages → module.description)
  category: "EXTENSION",                 // "CORE" | "OFFICIAL" | "EXTENSION"
  hasSchema: true,                       // schema.prisma varsa true
  // basePath: "/sponsorlar",            // Opsiyonel: nav yoksa veya farklı kök URL isteniyorsa
  // license: { feature: "sponsors" },   // Opsiyonel: RFC-002 lisans kapısı
  // requires: [{ module: "members", version: ">=1.0.0" }],
  // recommends: ["accounting"],
  // access: [{ module: "accounting", operations: ["read", "write"] }],
  // roles: [{ key: "SPONSOR_MANAGER", color: "secondary" }],
  // dependencies: { qrcode: "^1.5.4" }, // Çekirdek dışı npm paketleri → ardından `pnpm module:deps`
  nav: [
    {
      href: "/sponsors",
      label: "Sponsorlar",
      labelKey: "sponsors",              // messages → nav.sponsors ZORUNLU
      icon: Package,
      group: "main",                     // "main" | "settings"
      order: 50,
      permission: { definition: sponsorsPermissions, action: "view" },
      // hidden: true,                   // Başka modül menüsünden açılan alt modüller için
      // settingsGroup: "integrations",  // Yalnız group: "settings" için (#611)
      // settingsOrder: 20,
    },
  ],
  menu: [
    // Ana sayfa ("overview") otomatik eklenir; key: "overview" AYRILMIŞTIR, tekrar ekleme!
    {
      key: "settings",                   // messages → menu.settings ZORUNLU; ayar merkezinde otomatik listelenir
      label: "Ayarlar",
      href: "/sponsors/ayarlar",
      icon: Settings,
      permission: { definition: sponsorsPermissions, action: "update" },
      // settingsGroup: "module-management",
    },
    {
      key: "export",                     // messages → menu.export ZORUNLU
      label: "Excel",
      href: "/api/sponsors/export",
      icon: Download,
      isDownload: true,                  // API rotası → <a download>, RSC prefetch yok
    },
  ],
};
```

### Ayar Sayfası Yerleşim Kuralları
- **Bağımsız ayar/yönetim ekranı** (örn. E-posta, Kullanıcılar): `nav` öğesine `group: "settings"` + uygun `settingsGroup` ver:
  `"general" | "users-access" | "security-privacy" | "integrations" | "appearance" | "communication" | "ai-automation" | "module-management" | "system-management"`.
- **Modül içi ayar sayfası** (örn. `/sponsors/ayarlar`): `menu` içine `key: "settings"` öğesi ekle. Ayar merkezinde (`/ayarlar`) otomatik görünür.
- Kabuk veya ayar merkezine elle bağlantı/kart ekleme!

### `nav.json` (Sol Menü Varsayılan Kategorisi)
`src/modules/<anahtar>/nav.json`:
```json
{
  "categoryGroup": "association",
  "order": 50
}
```
Geçerli `categoryGroup` değerleri: `"association" | "finance" | "education" | "communication" | "operations"`. Alt modülse `"parentModule": "<ust-modul>"` ekle. `pnpm module:sync` bunu `src/shared/navigation/nav-defaults.generated.ts` içine işler.

### Sayfasız (Headless) Eklenti Modülleri
Kendi ekranı olmayan (yalnız `calendar-sync.ts`, `channels.ts`, `formats.ts`, `auth-providers.ts` sunan) eklentilerde `nav: []` bırak ve `basePath` tanımlama. `validate-module.ts` `href` ve `basePath` yoksa `page.tsx` uyarısı vermez.

---

## 3. Roller ve İzinler (`permissions.ts`)

Sistem rolleri (`src/shared/roles.ts`):
`ADMIN` (kilitli, değiştirilemez), `BOARD`, `SECRETARY`, `TREASURER`, `AUDITOR`, `TAX_ADVISOR`, `VIEWER`.
`validate-module.ts` ayrıca `TEACHER` rolünün de izin tablosunda yer almasını bekler (uyarı vermemesi için ekle).

```ts
import { definePermissions } from "@/shared/permissions/define";

export const sponsorsPermissions = definePermissions("sponsors", {
  ADMIN: ["view", "create", "update", "delete", "approve"],
  BOARD: ["view", "create", "update"],
  SECRETARY: ["view", "create", "update"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  TAX_ADVISOR: [],
  TEACHER: [],
  VIEWER: ["view"],
});

// Kapsam (scope) kuralı gerekiyorsa ayrı izin kaynağı tanımla (rol adı kontrolü yerine!):
export const sponsorsAllPermissions = definePermissions("sponsorsAll", {
  ADMIN: ["view"],
  BOARD: ["view"],
  SECRETARY: ["view"],
  TREASURER: [],
  AUDITOR: ["view"],
  TAX_ADVISOR: [],
  TEACHER: [],
  VIEWER: [],
});
```

Kurallar:
- `ADMIN`'e verilen aksiyonlar, "Roller ve İzinler" ekranında bu kaynak için desteklenen aksiyonları belirler.
- Her `definePermissions("<kaynak>", ...)` için `messages/{tr,de}.json` içinde `permissions.<kaynak>.label` ve `permissions.<kaynak>.description` **ZORUNLU**dur.
- Modül yeni bir rol getiriyorsa (`module.config.ts → roles: [{ key: "MY_ROLE", color: "secondary" }]`), `messages/{tr,de}.json` içinde `roles.MY_ROLE.label` ve `roles.MY_ROLE.shortDesc` **ZORUNLU**dur.
- Yetki kontrolü **DAİMA** `can(user.role, sponsorsPermissions, "update")` veya `await requirePermission(sponsorsPermissions, "view")` ile yapılır. `user.role === "BOARD"` veya `ROLES.includes(role)` `validate-module.ts` tarafından **HATA** sayılır.

---

## 4. `schema.prisma`, `DATA_POLICY` ve Silinme Hakkı (KVKK / DSGVO)

### `schema.prisma` Kuralları
```prisma
model SponsorItem {
  id          String   @id @default(uuid())
  title       String
  memberId    String?  // Yumuşak referans — başka modül tablosuna @relation YOK!
  memberLabel String?  // Anlık görüntü etiketi
  amountCents Int      @default(0) // Para daima integer cent veya Decimal(12,2)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([title])
  @@map("sponsors_items") // EXTENSION modüllerde <anahtar_altcizgili>_ öneki zorunlu!
}
```

### `src/shared/data-policy.ts` (ZORUNLU — `tests/shared/data-policy.test.ts` Denetler)
Her yeni Prisma modeli **mutlaka** `DATA_POLICY` nesnesine eklenmelidir:

| Kategori | Anlamı | Örnekler |
|---|---|---|
| `K0` | Yalnız sahip modül; AI kesinlikle okuyamaz. Sırlar, parolalar, serbest kişisel notlar, dosyalar, oylama. | `MailSettings`, `MemberNote`, `UserTotp` |
| `K1` | Diğer modüller public API + `access` ile kullanabilir; AI okuyamaz. Kişisel veri taşıyan tablolar. | `Donor`, `EventAttendee`, `CourseTeacher` |
| `K2` | Modüller ve AI serbest. Kişi içermeyen kurumsal/yapılandırma verisi. | `Event`, `InventoryItem`, `Course` |
| `K3` | Kurallı AI erişimi (yalnız türetilmiş/maskeli alanlar; `sensitiveFields` zorunlu). | `MailingCampaign`, `Document`, `Member` |

```ts
// src/shared/data-policy.ts → DATA_POLICY içinde:
SponsorItem: {
  owner: "sponsors",
  category: "K2",
  reason: "Kurumsal sponsorluk kayıtları",
  sensitiveFields: [],
  // Satırlar tek bir kullanıcıya aitse:
  // personalOwnerField: "userId",
},
```

### `userId` / `ownerId` Taşıyan Tablolar (`tests/shared/user-deletion.test.ts`)
Modelde `userId` veya `ownerId` sütunu varsa **ikisi de yapılmazsa test DÜŞER**:
- **Seçenek A (Kişisel veri — silinmeli):** `DATA_POLICY.<Model>.personalOwnerField = "userId"` (veya `"ownerId"`) yaz **VE** `src/modules/<anahtar>/lifecycle.ts` içinde `onUserDeleted` kancasında `getDb().<model>.deleteMany({ where: { userId } })` çağır.
- **Seçenek B (Kurumsal / yasal saklama — silinmez):** `src/shared/data-policy.ts → USER_LINK_RETAINED` nesnesine `ModelAdi: "Gerekçe..."` ekle.

---

## 5. Modüller Arası Erişim (`access`, `requires`, `recommends`)

`tests/modules/module-boundaries.test.ts` ve `scripts/validate-module.ts` her modülün tüm `.ts/.tsx` dosyalarını tarar:

| Bağ Türü | Örnek | `module.config.ts` Gereksinimi |
|---|---|---|
| Başka modül import'u | `@/modules/members/server`, `@/modules/members` | `access` (veya `requires` / `menu[].module`) |
| Başka modül `/api/` yolu | `fetch("/api/exports/...")`, `href="/api/..."` | `access` |
| Başka modül sayfa yolu | `href="/uyeler"`, `router.push("/muhasebe")` | `recommends` / `requires` / `access` / `menu[].module` |
| `auth` modülü | `@/modules/auth/server` (`createAction`, `requirePermission`) | **Muaf** (altyapı) |

### `validate-module.ts → operationFor(name)` Otomatik İşlem Çıkarımı
`@/modules/<hedef>/server` içe aktarımında fonksiyon adından gereken `operations` otomatik çıkarılır:
- `"delete"`: `/^(delete|remove|anonymi[sz]e|purge)/i`
- `"write"`: `/Action$/` veya `/^(create|update|record|reverse|send|save|set|add|link|unlink|make|issue|run|toggle|change|void|mark|generate|upload|import|write|approve|close|unlock)/`
- `"read"`: Diğer tüm adlar (dinamik `import(...)` ve `import * as` en az `"read"` sayılır; `import type` sayılmaz).

### Zorunlu Gerekçe & Çalışma Zamanı Kuralı
- Her `access` girdisi için `messages/tr.json` ve `messages/de.json` içinde `access.<hedefModül>` açıklaması ZORUNLUDUR (yönetici onay ekranında gösterilir).
- İstemciden başka modülün API'sini çağırmak yerine kendi server action'ından `@/modules/<hedef>/server` çağır.
- Başka modüle giden buton/link'i yalnız sunucuda `listUsableModuleKeys()` + `can(user.role, hedefPermissions, ...)` doğrulandıysa (istemciye boolean geçirerek) göster.

### Muhasebe & Üye Entegrasyonu (Standart Kalıplar)
- **Üye seçici:** `listMemberOptions()` (`@/modules/members/server`, `access: [{ module: "members", operations: ["read"] }]`).
- **Muhasebe fişi:** `createSourcedBooking`, `reverseSourcedBooking`, `getPaymentAccountTargets` (`@/modules/accounting/server`, `access: [{ module: "accounting", operations: ["read", "write"] }]`). Kendi `tx` içinde çağır; `sourceType` değerini muhasebenin `SOURCE_TYPE_VALUES` + `enums.sourceType` çevirisine ekle; her tahsilat için benzersiz `sourceId` üret.

---

## 6. `pnpm module:sync` Neleri Üretir? (Tam Harita)

`scripts/sync-schemas.ts` (her `dev`, `build`, `typecheck`, `db:migrate` öncesi de çalışır) şu dosyaların tamamını otomatik üretir — **HİÇBİRİNİ ELLE DÜZENLEME**:

| Kaynak (Modül İçi) | Üretilen Dosya / Klasör |
|---|---|
| `schema.prisma` | `prisma/schema/<anahtar>.prisma` |
| `messages/{tr,de}.json` | Kök `messages/{tr,de}.json` (`messages/shell/` + modüller) |
| `module.config.ts` | `src/registry.ts` |
| `nav.json` | `src/shared/navigation/nav-defaults.generated.ts` |
| `permissions.ts` | `src/permissions-registry.ts` |
| `releases.json` | `src/module-releases.ts` |
| `page.tsx`, `routes/<yol>/page.tsx` | `src/app/(dashboard)/(modules)/<rota>/.../page.tsx` (`withModuleGate` sarılı; `CORE` hariç) |
| `api/<yol>/route.ts` | `src/app/api/(modules)/<anahtar>/<yol>/route.ts` (`gateRouteHandler` sarılı; `CORE` hariç) |
| `public/<yol>/page.tsx` | `src/app/(public)/(modules)/<yol>/page.tsx` (`withModuleGate` sarılı; **`src/proxy.ts` matcher muafiyeti gerekir!**) |
| `cards/index.tsx` | `src/dashboard-cards.ts` |
| `ai.ts` | `src/ai-registry.ts` |
| `automation.ts` | `src/automation-registry.ts` (`defineTask` + `defineEvent`) |
| `lifecycle.ts` | `src/lifecycle-registry.ts` |
| `demo.ts` | `src/demo-registry.ts` |
| `widget.ts` | `src/widget-registry.ts` (istemci-güvenli!) |
| `secretary.ts` | `src/secretary-registry.ts` |
| `notifications.ts` | `src/notification-registry.ts` |
| `calendar.ts` | `src/calendar-registry.ts` |
| `calendar-sync.ts` | `src/calendar-sync-registry.ts` |
| `channels.ts` | `src/campaign-channel-registry.ts` |
| `recipients.ts` | `src/recipient-registry.ts` |
| `formats.ts` | `src/format-registry.ts` |
| `compliance.ts` | `src/compliance-registry.ts` |
| `auth-providers.ts` | `src/auth-provider-registry.ts` (sunucu-özel) |

### Rota Segment Ayarları (`runtime`, `dynamic`, `maxDuration`…)
`sync-routes.ts`, kaynak `page.tsx` veya `route.ts` dosyasındaki üst seviye `export const runtime = "nodejs";`, `dynamic`, `revalidate`, `fetchCache`, `preferredRegion`, `maxDuration` satırlarını üretilen köprü dosyasına otomatik kopyalar. Bunları kaynak dosyada tek satır `export const ... = ...;` olarak yaz.

### Oturumsuz (`public/`) Sayfa ve Webhook API'leri
- Oturumsuz sayfa: `src/modules/<anahtar>/public/<yol>/page.tsx` → `/<yol>`.
- Oturumsuz API / Webhook: `src/modules/<anahtar>/api/<yol>/route.ts` → `/api/<anahtar>/<yol>`.
- Her ikisi için de `src/proxy.ts → config.matcher` negatif lookahead desenine yol öneki eklenmelidir (aksi halde Auth.js giriş sayfasına yönlendirir). Sayfa/API kendi token/imza/rate-limit (`@/shared/security/rate-limit`) doğrulamasını yapmak zorundadır.
