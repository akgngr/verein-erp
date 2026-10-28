# Verein ERP — Modül Geliştirme ve Mimari İzolasyon Rehberi
> **Hedef:** Bu rehber, ister bir insan yazılımcı ister **harici bir AI Agent** olsun, projeye diğer modülleri bozmadan, minimum ve kontrollü bağımlılıkla yeni bir modül geliştirebilmesi için hazırlanmıştır.

---

## 1. Temel Mimari İlkeler (Architecture Philosophy)

1. **İzole Dikey Dilimler (Vertical Slice Architecture):**
   Her modül kendi veri tabanı şemasını, iş mantığını, yetkilerini, UI bileşenlerini ve sayfalarını kendi sınırları içinde barındırır.
2. **Sıfır Sızıntı (Zero Internal Leaks):**
   Bir modülün iç dosyaları (`actions/`, `queries/`, `components/`, `services/`) **özeldir (private)**. Dış dünyayla yalnızca `index.ts` ve `server.ts` üzerinden konuşur.
3. **Sözleşmeye Dayalı İletişim (Contract-Driven Integration):**
   Eğer Modül A, Modül B'ye ihtiyaç duyuyorsa; doğrudan B'nin veritabanına sorgu atamaz veya iç fonksiyonunu çağıramaz. Modül B'nin `server.ts` içindeki kamuya açık **Servis Facade** fonksiyonunu çağırır.
4. **Yumuşak Veritabanı Bağlantıları (Soft DB References):**
   Farklı modüllerin tabloları arasında derin SQL `JOIN` veya zorlayıcı `Foreign Key` ilişkileri yerine, kimlik referansı (`memberId: String`) ve uygulama seviyesinde doğrulama tercih edilir.
5. **Standart Tasarım Dili & Araç Çubuğu:**
   Tüm modüller `DataTable`, `DateRangeFilter` ve standart 2 parçalı filtreleme sistemini (`DataTableToolbar`) kullanarak UI tutarlılığını sağlar.

---

## 2. Standart Modül Anatomisi

Her yeni modül `src/modules/<modul_adi>/` altında şu klasör ve dosya hiyerarşisine sahip olmalıdır:

```
src/modules/<modul_adi>/
├── schema.prisma          # [YENİ] Modülün veritabanı modelleri (Otomatik prisma/schema'ya senkronize olur)
├── permissions.ts         # Modüle ait RBAC izin tanımları (create, read, update, delete)
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
├── index.ts               # Kamuya açık İZOMORFİK / UI giriş noktası (Public API)
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

---

## 4. Otomatik Prisma Şema Senkronizasyonu (`scripts/sync-schemas.ts`)

Geliştiriciler ve AI Agent'lar `prisma/schema/` klasörüne elle dosya eklemek zorunda değildir.
* Bir modülün içine `src/modules/<modul>/schema.prisma` konulduğunda, `pnpm dev`, `pnpm build` veya `pnpm db:migrate` çalıştırıldığı anda bu dosya otomatik olarak `prisma/schema/<modul>.prisma` içine sembolik bağlanır.
* Manuel tetiklemek için: `pnpm run sync:schemas` veya arayüzdeki *"Şemaları Senkronize Et"* butonu kullanılabilir.

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
```

### Modül Geliştiricisinin Sorumluluğu:
Eğer geliştirdiğiniz modülün başka modüller tarafından kullanılmasını istediğiniz bir fonksiyonu varsa, bunu `server.ts` veya `index.ts` dosyasından `export` edin:
```typescript
// src/modules/members/server.ts
export async function getMemberSummary(memberId: string): Promise<MemberSummary | null> {
  // Veriyi çeker ve sadece gerekli alanları döner
}
```

---

## 4. Bir AI Agent'ın Yeni Modül Geliştirme Adımları (Checklist)

Bir yapay zeka ajanının projeye yeni bir modül (örneğin: `inventory` - Demirbaş Yönetimi) eklerken izleyeceği kesin adımlar:

### Adım 1: Veritabanı Şeması (`prisma/schema/`)
1. `prisma/schema/inventory.prisma` dosyasını oluşturun.
2. Modelleri tanımlayın. İlişkili modüllerin (ör. `User`) sadece ID'sini referans alın (`createdById String`).
3. Şema değişikliğini uygulayın:
   ```bash
   bunx prisma migrate dev --name add_inventory
   ```

### Adım 2: İzinleri Tanımlayın (`permissions.ts`)
```typescript
// src/modules/inventory/permissions.ts
import type { PermissionDefinition } from "@/shared/permissions/define";

export const inventoryPermissions: PermissionDefinition = {
  resource: "inventory",
  actions: ["view", "create", "update", "delete"] as const,
  grants: {
    ADMIN: ["view", "create", "update", "delete"],
    BOARD: ["view", "create", "update"],
    MEMBER: ["view"],
    AUDITOR: ["view"],
  },
};
```

### Adım 3: Sorgular ve Eylemler (`queries/` & `actions/`)
* **Sorgular (`queries/`):** Veritabanından veri çeker. Sayfalama için `parseListParams` formatını destekler.
* **Eylemler (`actions/`):** `"use server"` etiketli olmalıdır. Mutlaka Zod şeması ile doğrulanmalı ve `requirePermission(inventoryPermissions, "action")` ile korunmalıdır.

### Adım 4: UI Bileşenleri ve Standart Toolbar
Tablolar `DataTable` bileşenini kullanmalıdır:
```tsx
// src/modules/inventory/components/inventory-table.tsx
<DataTable
  columns={columns}
  rows={rows}
  total={total}
  page={page}
  pageSize={pageSize}
  dateFilter={<DateRangeFilter label="Kayıt Tarihi" idPrefix="inv-date" />}
  filters={[
    { key: "status", label: "Durum", options: STATUS_OPTIONS },
  ]}
/>
```

### Adım 5: Sayfa Rotaları (`src/app/(dashboard)/`)
Sayfa dosyaları (`page.tsx`) "ince" (thin) tutulur; yalnızca modüldeki RSC View'ı çağırır:
```tsx
// src/app/(dashboard)/demirbas/page.tsx
import { InventoryListView } from "@/modules/inventory/views/inventory-list-view";
import type { RawSearchParams } from "@/shared/list-params";

export default async function Page({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return <InventoryListView searchParams={searchParams} />;
}
```

### Adım 6: Navigasyon ve Menü Kaydı (`src/registry.ts`)
Modülü sol menüye eklemek için `src/registry.ts` içindeki `modules` dizisine config ekleyin:
```typescript
{
  id: "inventory",
  label: "Demirbaş",
  href: "/demirbas",
  icon: Package, // lucide-react
  group: "operations",
  order: 40,
  permission: { definition: inventoryPermissions, action: "view" },
}
```

### Adım 7: Doğrulama ve Sağlamlık Testi
Değişikliklerin mimariyi bozmadığından emin olmak için terminalde çalıştırın:
```bash
pnpm typecheck  # 0 hata olmalı
pnpm lint       # 0 hata olmalı (modül sınır kontrolleri)
```

---

## 5. İleri Düzey İzolasyon: Olay Tabanlı İletişim (In-App Event Bus)

Gelecekte modüllerin birbirini hiç çağırmadan haberleşebilmesi için **Event-Driven Architecture** kullanılabilir:
1. `src/shared/events/event-bus.ts` üzerinde tipli olaylar tanımlanır.
2. Modül A eylem bittiğinde emit eder:
   ```typescript
   eventBus.emit("member.created", { memberId: member.id, email: member.email });
   ```
3. Modül B (örn: Bildirimler veya Muhasebe) bu olayı dinler ve kendi içinde işlem yapar.
4. Böylece Modül A, Modül B'nin varlığından dahi haberdar olmak zorunda kalmaz.
