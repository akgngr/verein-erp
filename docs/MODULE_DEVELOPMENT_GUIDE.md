# Verein ERP — Modül Geliştirme, İzolasyon ve Çok Dilli Mimari Rehberi
> **Hedef:** Bu rehber, ister bir insan yazılımcı ister **harici bir AI Agent** olsun, projeye diğer modülleri bozmadan, minimum ve kontrollü bağımlılıkla yeni bir modül geliştirebilmesi için hazırlanmıştır.

---

## 1. Temel Mimari İlkeler (Architecture Philosophy)

1. **İzole Dikey Dilimler (Vertical Slice Architecture):**
   Her modül kendi veri tabanı şemasını, iş mantığını, yerelleştirme (i18n) çevirilerini, yetkilerini, UI bileşenlerini ve sayfalarını kendi sınırları içinde barındırır.
2. **Sıfır Sızıntı (Zero Internal Leaks):**
   Bir modülün iç dosyaları (`actions/`, `queries/`, `components/`, `services/`) **özeldir (private)**. Dış dünyayla yalnızca `index.ts`, `server.ts` ve `ui.ts` üzerinden konuşur.
3. **Sözleşmeye Dayalı İletişim (Contract-Driven Integration):**
   Eğer Modül A, Modül B'ye ihtiyaç duyuyorsa; doğrudan B'nin veritabanına sorgu atamaz veya iç fonksiyonunu çağıramaz. Modül B'nin `server.ts` içindeki kamuya açık **Servis Facade** fonksiyonunu çağırır.
4. **Yumuşak Veritabanı Bağlantıları (Soft DB References):**
   Farklı modüllerin tabloları arasında derin SQL `JOIN` veya zorlayıcı `Foreign Key` ilişkileri yerine, kimlik referansı (`memberId: String`) ve uygulama seviyesinde doğrulama tercih edilir.
5. **Standart Tasarım Dili & Araç Çubuğu:**
   Tüm modüller `DataTable`, `DateRangeFilter` ve standart 2 parçalı filtreleme sistemini (`DataTableToolbar`) kullanarak UI tutarlılığını sağlar.
6. **Modüler Çok Dilli Destek (Bilingual i18n — TR / DE):**
   Her modül kendi çevirilerini (`i18n/tr.json` ve `i18n/de.json`) kendi dizininde tutar. Sistem bu çevirileri otomatik olarak ana sözlüklere senkronize eder.

---

## 2. Standart Modül Anatomisi

Her yeni modül `src/modules/<modul_adi>/` altında şu klasör ve dosya hiyerarşisine sahip olmalıdır:

```
src/modules/<modul_adi>/
├── schema.prisma          # Modülün veritabanı modelleri (Otomatik prisma/schema'ya senkronize olur)
├── i18n/                  # [YENİ] Modülün yerelleştirilmiş metinleri (Otomatik messages/'a senkronize olur)
│   ├── tr.json            # Türkçe çeviriler
│   └── de.json            # Almanca çeviriler (Verein terminolojisi)
├── permissions.ts         # Modüle ait RBAC izin tanımları (create, view, update, delete, approve)
├── module.config.ts       # Menü, kategori (CORE/OFFICIAL/EXTENSION), ikon, rota eşleşmesi
├── types.ts               # Modül içi tipler ve modeller
├── constants.ts           # Filtre sabitleri, enum etiketleri, varsayılan değerler
├── schemas/               # Zod doğrulama şemaları (Server action girişleri için)
│   └── create-<modul>.ts
├── queries/               # Salt-okunur veritabanı sorguları (RSC için)
│   ├── list-<modul>.ts
│   └── get-<modul>.ts
├── actions/               # Veri yazma / değiştirme işlemleri (Server Actions)
│   ├── create-<modul>.ts
│   └── delete-<modul>.ts
├── services/              # Ağır iş kuralları, harici servisler veya PDF/hesaplama mantığı
├── components/            # Modüle özel Client/Server bileşenleri (Tablolar, Modallar)
│   ├── <modul>-table.tsx
│   └── <modul>-form-modal.tsx
├── views/                 # Sayfa görünüm bileşenleri (RSC - Server Component)
│   ├── <modul>-list-view.tsx
│   └── <modul>-detail-view.tsx
├── index.ts               # Kamuya açık İZOMORFİK / Tipler giriş noktası (Public API)
├── ui.ts                  # Kamuya açık UI bileşenleri girişi
└── server.ts              # Kamuya açık SUNUCU giriş noktası (Public Server API)
```

---

## 3. Modül Kategorileri ve Yaşam Döngüsü

Sistemdeki tüm modüller 3 kategoriden birine ait olmak zorundadır (`module.config.ts` içinde `category` alanı):

| Kategori | Tanım | Örnekler | Pasife Alınabilir mi? | Silinebilir mi? |
|---|---|---|:---:|:---:|
| **CORE** (Çekirdek) | Sistemin çalışması için zorunlu altyapı | `auth`, `users`, `organization`, `audit`, `system` | ❌ Hayır | ❌ Hayır |
| **OFFICIAL** (Resmi) | Verein ERP'nin yerleşik dernek fonksiyonları | `members`, `accounting`, `documents`, `meetings`, `donations` | ✅ Evet | ❌ Hayır |
| **EXTENSION** (Eklenti) | AI Agent veya dış geliştirici tarafından eklenen bağımsız eklentiler | `inventory`, `events`, vb. | ✅ Evet | ✅ Evet |

> **Modül Yönetimi Arayüzü:** Yöneticiler `/ayarlar/moduller` sayfasından tüm modüllerin durumunu tek tıkla aktif/pasif yapabilir veya eklentileri kaldırabilir. Pasif modüller sol menüde gizlenir.
> **Merkezi Ayarlar Sayfası:** `/ayarlar` sayfasından tüm dernek ve sistem yapılandırmaları, modüller ve dil tercihleri yönetilir.

---

## 4. Otomatik Şema ve Çeviri Senkronizasyonu

Geliştiriciler ve AI Agent'lar merkezi dosyalara müdahale etmek zorunda değildir:
1. **Prisma Şemaları:** Bir modülün içine `src/modules/<modul>/schema.prisma` konulduğunda, `pnpm dev`, `pnpm build`, `pnpm typecheck` veya `pnpm db:migrate` anında bu dosya otomatik olarak `prisma/schema/<modul>.prisma` içine sembolik bağlanır.
2. **i18n Çevirileri:** Bir modülün içine `src/modules/<modul>/i18n/tr.json` ve `de.json` konulduğunda, otomatik olarak `messages/tr.json` ve `messages/de.json` içine ilgili modül ad alanı (`messages[moduleKey]`) altında derinlemesine birleştirilir.
3. **Manuel Senkronizasyon:** Terminalde `pnpm sync:schemas` çalıştırarak veya arayüzdeki *"Şemaları Senkronize Et"* butonu ile her an tetiklenebilir.

---

## 5. Modüller Arası Bağımlılık Kuralları (Boundary Rules)

Bu kurallar `eslint.config.mjs` tarafından katı şekilde denetlenir. Kural ihlali derleme hatasına (`pnpm lint`) yol açar.

### ❌ Yasak Olanlar (Strictly Forbidden)
```typescript
// YASAK: Başka bir modülün iç dosyasına erişilemez!
import { deleteDocumentAction } from "@/modules/documents/actions/delete-document";
import { getMemberById } from "@/modules/members/queries/get-member";
import { MemberTable } from "@/modules/members/components/member-table";
```

### ✅ İzin Verilen ve Zorunlu Olanlar (Standard Public API)
```typescript
// DOĞRU: İstemci veya tip erişimi -> @/modules/<modul>
import type { MemberListItem } from "@/modules/members";

// DOĞRU: Sunucu tarafı veri erişimi -> @/modules/<modul>/server
import { getMemberSummary, listActiveUserOptions } from "@/modules/auth/server";

// DOĞRU: Kamuya açık UI bileşenleri -> @/modules/<modul>/ui
import { DocumentListView } from "@/modules/documents/ui";
```

---

## 6. Bir AI Agent'ın Yeni Modül Geliştirme Adımları (Checklist)

Bir yapay zeka ajanının projeye yeni bir modül (örneğin: `inventory` - Demirbaş Yönetimi) eklerken izleyeceği kesin adımlar:

### Adım 1: Modül Klasörü ve Şeması
`src/modules/inventory/schema.prisma` dosyasını oluşturun. Modelleri tanımlayın. İlişkili modüllerin (ör. `User`) sadece ID'sini referans alın (`createdById String`).

### Adım 2: Çok Dilli Sözlükler (`i18n/`)
`src/modules/inventory/i18n/tr.json` ve `de.json` dosyalarını oluşturun.
Bileşenlerde `useTranslations("inventory")` veya `getTranslations("inventory")` ile kullanın.

### Adım 3: İzinleri Tanımlayın (`permissions.ts`)
```typescript
import type { PermissionDefinition } from "@/shared/permissions/define";

export const inventoryPermissions: PermissionDefinition = {
  resource: "inventory",
  grants: {
    ADMIN: ["view", "create", "update", "delete"],
    BOARD: ["view", "create", "update"],
    SECRETARY: ["view"],
    TREASURER: ["view"],
    AUDITOR: ["view"],
    VIEWER: ["view"],
  },
};
```

### Adım 4: Modül Yapılandırması (`module.config.ts`)
```typescript
export const moduleConfig: ModuleConfig = {
  key: "inventory",
  label: "Demirbaş",
  description: "Dernek demirbaş ve envanter takibi.",
  category: "EXTENSION",
  isProtected: false,
  hasSchema: true,
  nav: [
    {
      href: "/demirbas",
      label: "Demirbaş",
      icon: Package,
      group: "main",
      order: 40,
      permission: { definition: inventoryPermissions, action: "view" },
    },
  ],
};
```

### Adım 5: Navigasyon Kaydı (`src/registry.ts`)
`src/registry.ts` dosyasına yeni modülü import edin ve `allModules` dizisine ekleyin.

### Adım 6: Doğrulama ve Testler
Değişikliklerin mimariyi bozmadığından emin olmak için terminalde çalıştırın:
```bash
pnpm test       # Birim ve entegrasyon testleri (100% geçmeli)
pnpm typecheck  # TypeScript tip denetimi (0 hata)
pnpm lint       # Mimari sınır ve kod stili denetimi (0 hata)
```
