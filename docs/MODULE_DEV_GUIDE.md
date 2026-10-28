# Verein ERP — Modül Geliştirme Rehberi & Dış AI Şartnamesi
> **Sürüm:** 2.1 (Harici AI Agent ve İzole Geliştirici Özel Sürümü)  
> **Hedef Kitle:** Projeye terminal/CLI erişimi **olmayan** veya **olan** harici AI Agent'lar (ChatGPT, Claude web/chat, Gemini, Cursor, Windsurf) ve Bağımsız Geliştiriciler

Bu rehber, **Verein ERP** sistemine diğer modülleri ve çekirdek sistemi bozmadan, sıfır temas (**zero-touch core**) prensibiyle çalışan yeni bir modül eklemek için gereken standartları, dosya ağacını, şablon kodları ve harici AI agent'lar için özelleştirilmiş hazır istemleri (prompt) içerir.

---

## 1. Temel Mimari Prensipler (Architecture Principles)

1. **Sıfır Çekirdek Dokunuşu (Zero-Touch Core):**
   Yeni bir modül geliştirirken veya mevcut bir modülü silerken çekirdek dosyalara (`src/registry.ts`, `prisma/schema/*`, `messages/*.json`) **ASLA ELLE MÜDAHALE EDİLMEZ**. Tüm kayıtlar ve bağlantılar projedeki senkronizasyon araçları tarafından dinamik olarak yönetilir.
2. **Dikey Dilim İzolasyonu (Vertical Slice Isolation):**
   Modüle ait veritabanı şeması, iş kuralları, yetki tanımları, çevirileri, sayfaları ve bileşenleri tamamen `src/modules/<modul_adi>/` dizini içinde yer alır.
3. **Katı Kamu API Sınırları (Public API Boundary - `eslint.config.mjs`):**
   Bir modülün iç klasörleri (`queries/`, `actions/`, `components/`, `views/`, `services/`) **özeldir (private)**. Dış dünyaya ve diğer modüllere yalnızca şu 3 kamuya açık dosya üzerinden konuşur:
   - `@/modules/<modul>` (`index.ts` — İzomorfik tipler, şemalar, yetki tanımları, moduleConfig)
   - `@/modules/<modul>/server` (`server.ts` — "server-only" sorgular, sunucu aksiyonları, yetki korumaları)
   - `@/modules/<modul>/ui` (`ui.ts` — React istemci ve sunucu görünüm bileşenleri)
4. **Üst Bar Menüsü Standardı (`menu/top.json`):**
   Her modülün alt sayfaları, modüle özel yapılandırmaları ve dışa aktarma (Excel vb.) araçları sayfa içine buton yığılması yerine modül dizinindeki `menu/top.json` dosyasında bildirilir ve dinamik Mac-tarzı üst barda gösterilir.
5. **Sayfa Eylem Ayrımı Kuralı (UI Action Area Separation):**
   - **Sayfa Başlığı Eylem Alanı (`PageHeader actions`):** YALNIZCA doğrudan ana CRUD butonuna (`+ Yeni Ekle`) ayrılmıştır.
   - **Araçlar, Raporlar ve Alt Sayfa Bağlantıları:** `menu/top.json` içinde tanımlanır; sayfa gövdesinde mükerrer buton olarak gösterilmez.
6. **Server Component (RSC) vs Client Component Katı Dosya Ayrımı:**
   - **Görünümler (`views/*-view.tsx`) ve Sayfalar (`page.tsx`) YALNIZCA Server Component'tir (RSC):** Başlarına ASLA `"use client"` konulamaz; içlerinde `useState`, `useEffect`, `useRouter`, inline `"use server"` yazılamaz ve `@heroui/react` import edilemez (React 19 Server ortamında `createContext` olmadığı için build çöker).
   - **Tüm İstemci Etkileşimi YALNIZCA `components/` Klasöründe Yaşar:** Eğer bir modal, form, buton tıklaması, filtre aracı, tablo veya etkileşimli bir öğe yazılacaksa bu KESİNLİKLE `src/modules/<modul>/components/` altında ayrı bir dosya olarak yazılır ve ilk satırına `"use client";` konur. `@heroui/react` kütüphanesi YALNIZCA bu client bileşenleri içinde kullanılır. Server component'ler istemci bileşenlerini `components/` klasöründen import edip saf veriyi prop olarak geçirir.
7. **Resmi İthalat (Import) Standardı Tablosu:**
   - Veritabanı Singleton: `import { getDb } from "@/shared/db";` -> `const db = getDb();` (ASLA `@/shared/lib/prisma` veya `new PrismaClient()` yazma!)
   - Yetki Denetimi (Server): `import { requirePermission } from "@/shared/lib/permissions-service";`
   - Yetki Tanımlama: `import { definePermissions } from "@/shared/types/permissions";`
   - Sayfa Başlığı: `import { PageHeader } from "@/shared/components/ui/page-header";`
   - Boş Durum: `import { EmptyState } from "@/shared/components/ui/empty-state";`
   - Veri Tablosu: `import { DataTable, DataTablePagination } from "@/shared/components/data-table";`
   - Modül İçi İthalatlar: Kendi modülün içindeki dosyaları import ederken göreli yollar (`./` veya `../`) kullan.
   - Dış Modüller: ASLA başka modülün iç dosyalarını import etme. Yalnızca `@/modules/<modul>`, `@/modules/<modul>/server` ve `@/modules/<modul>/ui` kullan. Modül içinden `src/app` katmanını ASLA import etme.
8. **"Services" ve "Helpers" Katı Ayrımı (İnce Görünüm / Thin Views Prensibi):**
   - **Görünümler (`views/*-view.tsx`):** Kesinlikle içinde hesaplama, matematiksel işlem veya ham sorgu barındırmaz. View yalnızca bir orkestratördür: `queries` ile veriyi çeker, `helpers`/`services` ile işler ve `components`'e aktarır.
   - **`helpers/` (Saf Fonksiyonlar - Pure Functions):** Yan etkisi (side-effect) olmayan deterministik matematik ve mantık fonksiyonları. Örneğin: oran/kontenjan hesaplamaları (`calculateCapacityRatio`), tarih kıyaslamaları (`isEventPast`), para/metin formatlama.
   - **`services/` (İş Mantığı ve Dış Entegrasyonlar):** Çok adımlı iş akışları, dış API çağrıları, dosya dışa aktarma (Excel/PDF) motorları.

---

## 2. Eksiksiz Modül Klasör Ağacı (Complete Tree Structure)

Projeye terminal erişimi olmayan bir AI veya geliştirici, **`src/app` katmanına ASLA dokunmadan**, tüm modülü yalnızca `src/modules/<modul_adi>/` altında oluşturur. `pnpm module:sync` komutu `page.tsx` dosyasını otomatik olarak keşfeder ve `src/app/(dashboard)/<modul_adi>/page.tsx` köprüsünü kendisi kurar:

```text
src/
└── modules/
    └── <modul_adi>/                          # Örn: inventory
        ├── page.tsx                         # [OTOMATİK ROTA] Modülün Next.js sayfası (src/app'e dokunulmaz!)
        ├── module.config.ts                  # Modül meta verisi, sidebar menü tanımı, yetki bağlamı
        ├── permissions.ts                   # definePermissions ile rol bazlı yetki matrisi
        ├── schema.prisma                    # Modülün Prisma veritabanı modelleri
        ├── index.ts                         # Kamuya açık İZOMORFİK giriş noktası (Public API)
        ├── server.ts                        # Kamuya açık SUNUCU giriş noktası ("server-only")
        ├── ui.ts                            # Kamuya açık UI bileşenleri girişi
        │
        ├── menu/
        │   └── top.json                     # [STANDART] Üst bar araçları, alt sekmeler ve linkler
        │
        ├── messages/
        │   ├── tr.json                      # Türkçe yerelleştirilmiş metinler
        │   └── de.json                      # Almanca yerelleştirilmiş metinler (Verein terminolojisi)
        │
        ├── types/ (veya types.ts)           # Modül içi TypeScript tipleri ve arayüzler
        ├── constants.ts                     # Filtre sabitleri, sıralama alanları, varsayılanlar
        │
        ├── schemas/                         # Zod doğrulama şemaları
        │   └── <modul_adi>-schema.ts        # Form validasyon şeması (create/update)
        │
        ├── helpers/                         # [SAF FONKSİYONLAR] Hesaplama, oran, tarih/para formatlama
        │   └── <modul_adi>-helpers.ts       # calculateRatio, isPast, formatDateRange
        │
        ├── services/                        # [İŞ AKIŞI & SERVİSLER] Dış API, Excel/PDF export
        │   └── <modul_adi>-service.ts       # İş süreçleri ve entegrasyon servisleri
        │
        ├── queries/                         # Salt-okunur veritabanı sorguları (RSC için)
        │   └── list-<modul_adi>.ts          # Sayfalanmış listeleme sorgusu
        │
        ├── actions/                         # Server Actions ("use server" form aksiyonları)
        │   └── <modul_adi>-actions.ts       # Ekleme, güncelleme, silme mutasyonları
        │
        ├── components/                      # Modüle özel React bileşenleri ("use client")
        │   ├── <modul_adi>-table.tsx        # DataTable listeleme tablosu
        │   ├── <modul_adi>-form-modal.tsx   # Ekleme / düzenleme modal formu (@heroui/react)
        │   └── <modul_adi>-create-modal.tsx # ["use client"] URL (?action=new) yöneten modal sarmalayıcısı
        │
        └── views/                           # Sayfa düzeyinde Server Component görünümleri (RSC)
            └── <modul_adi>-list-view.tsx    # İnce görünüm: queries, helpers ve components orkestratörü
```

---

## 3. Adım Adım Dosya Şablonları & Kurallar

### 1. `module.config.ts` (Modül Kimliği ve Menüsü)
```typescript
import { Package } from "lucide-react"; // İlgili Lucide ikonu
import type { ModuleConfig, TopNavItem } from "@/shared/types/module";
import { inventoryPermissions } from "./permissions";
import topNav from "./menu/top.json";

export const moduleConfig: ModuleConfig = {
  key: "inventory",                       // Klasör adıyla BİREBİR AYNI olmalıdır
  label: "Envanter",                      // Modülün görünen adı (TR)
  description: "Dernek demirbaş ve malzeme takibi.",
  category: "EXTENSION",                  // Eklentiler için 'EXTENSION', sistem için 'CORE'/'OFFICIAL'
  hasSchema: true,                        // Veritabanı tablosu varsa true
  topNav: topNav as TopNavItem[],         // menu/top.json üst bar bağlantısı
  nav: [
    {
      href: "/inventory",
      label: "Envanter",
      labelKey: "inventory",              // nav.<key> olarak çeviride çözülür
      icon: Package,
      group: "main",                      // 'main' (ana menü) veya 'settings' (ayarlar altı)
      order: 10,
      permission: { definition: inventoryPermissions, action: "view" },
    },
  ],
};
```

---

### 2. `menu/top.json` (Mac-Tarzı Üst Bar Navigasyonu)
Sayfada buton kalabalığı yaratmak yerine araçlar, filtreler, alt sayfalar ve Excel dışa aktarımı burada tanımlanır:
```json
[
  {
    "key": "overview",
    "label": "Genel Bakış",
    "href": "/inventory",
    "icon": "LayoutGrid"
  },
  {
    "key": "categories",
    "label": "Kategoriler",
    "href": "/inventory/kategoriler",
    "icon": "FolderTree"
  },
  {
    "key": "export",
    "label": "Excel'e Aktar",
    "href": "/api/inventory/export",
    "icon": "FileSpreadsheet",
    "isDownload": true
  }
]
```
> **Kural:** `href` mutlaka `/` ile başlamalıdır. İkon isimleri standart Lucide ikon adıdır (PascalCase).

---

### 3. `permissions.ts` (6 Temel Rol Yetki Matrisi)
Sistemde 6 rol vardır. Yetki matrisi bu rolleri eksiksiz içermelidir:
```typescript
import { definePermissions } from "@/shared/permissions/define";

export const inventoryPermissions = definePermissions("inventory", {
  ADMIN: ["view", "create", "update", "delete", "approve"],
  BOARD: ["view", "create", "update"],
  SECRETARY: ["view", "create", "update"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  VIEWER: ["view"],
});
```

---

### 4. `schema.prisma` (Veritabanı Modelleri & Çakışma Önleme)
- Tablo isimlerinde çakışmayı önlemek için mutlaka `@@map("<modul_adi>_...")` ön eki kullanılmalıdır.
- Başka modüllerin tablolarına zorlayıcı `@relation` kurmak yerine **Yumuşak Referans (Soft Reference)** tercih edilir (örn: `memberId String?`).

```prisma
model InventoryItem {
  id          String   @id @default(uuid())
  title       String
  category    String   @default("GENEL")
  quantity    Int      @default(1)
  location    String?
  notes       String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("inventory_items")
}
```

---

### 5. `messages/tr.json` ve `messages/de.json` (İki Dilli i18n Desteği)
Modül metinleri otomatik olarak ana dil sözlüğünde modül anahtarı (`messages.<modul_adi>`) altına yerleşir.

```json
// messages/tr.json
{
  "title": "Envanter ve Demirbaş",
  "description": "Dernek malzemeleri, demirbaşlar ve zimmet kayıtları.",
  "newItem": "Yeni Demirbaş",
  "emptyTitle": "Demirbaş kaydı bulunamadı",
  "emptyDescription": "Yeni bir demirbaş eklemek için butona tıklayın.",
  "fields": {
    "title": "Başlık",
    "category": "Kategori",
    "quantity": "Adet",
    "location": "Konum"
  }
}
```

```json
// messages/de.json
{
  "title": "Inventar & Sachmittel",
  "description": "Verwaltung von Vereinsinventar und Sachmitteln.",
  "newItem": "Neuer Eintrag",
  "emptyTitle": "Keine Einträge vorhanden",
  "emptyDescription": "Klicken Sie auf den Button, um das erste Inventar anzulegen.",
  "fields": {
    "title": "Titel",
    "category": "Kategorie",
    "quantity": "Anzahl",
    "location": "Standort"
  }
}
```

---

### 6. Public API Giriş Noktaları (`index.ts`, `server.ts`, `ui.ts`)

#### `index.ts` (İzomorfik — Hem İstemci Hem Sunucu)
> **DİKKAT:** `index.ts` KESİNLİKLE `import "server-only"` İÇEREMEZ. Sadece tipler, şemalar ve moduleConfig export edilir.
```typescript
export { moduleConfig } from "./module.config";
export { inventoryPermissions } from "./permissions";
```

#### `server.ts` (Sunucu — "server-only" Zorunludur)
```typescript
import "server-only";

export { inventoryPermissions } from "./permissions";
export { listInventoryItems } from "./queries/list-inventory";
export { createInventoryAction, deleteInventoryAction } from "./actions/inventory-actions";
```

#### `ui.ts` (Görünümler ve UI Bileşenleri)
```typescript
export { InventoryListView } from "./views/inventory-list-view";
```

---

### 7. Modül Sayfası (`src/modules/<modul_adi>/page.tsx`)
> **Önemli:** Next.js App Router köprüsü (`src/app/(dashboard)/<modul_adi>/page.tsx`) `pnpm module:sync` tarafından otomatik olarak üretilir. Geliştirici veya AI doğrudan modülün kendi içindeki `src/modules/<modul_adi>/page.tsx` dosyasını yazar; `src/app` dizinine ASLA manuel dosya eklemez.

```typescript
import { InventoryListView } from "./views/inventory-list-view";

export const metadata = {
  title: "Envanter — Verein ERP",
  description: "Dernek demirbaş ve malzeme takibi.",
};

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <InventoryListView searchParams={searchParams} />;
}
```

---

### 8. UI, Tablolar, HeroUI ve KRİTİK SSR / React 19 Kuralları

1. **Sayfa Başlığı Eylem Alanı (`PageHeader actions`):** Sadece ana CRUD butonunu (`+ Yeni ...`) barındırır.
2. **Tablolar:** `@/shared/components/data-table` bileşenleri (`DataTable`, `DataTablePagination`) kullanılır.
3. ⚠️ **HeroUI (`@heroui/react`) Kullanım Sınırı:**
   - `@heroui/react` bileşenleri (Modal, Button, Input, Textarea, Checkbox) **YALNIZCA `"use client"` olan istemci bileşenlerinde (`components/*.tsx`)** kullanılabilir.
   - Server Component olan `views/*-view.tsx` veya `page.tsx` içinde `@heroui/react` (Chip, Progress vb.) **KESİNLİKLE IMPORT EDİLEMEZ**. React 19 Server ortamında `createContext` bulunmadığından Next.js build `TypeError: createContext is not a function` hatasıyla çöker. Sayfa düzeyindeki statik rozetler ve barlar için saf Tailwind CSS sınıfları kullanın.
4. ⚠️ **KRİTİK SSR HYDRATION KURALI (React 19 / Next.js 16):**
   - Tablo satırları (`map`) veya dinamik listeler içinde asla HeroUI'ın `<Select>` bileşenini kullanmayın. HeroUI Select rastgele dinamik `react-aria` kimlikleri ürettiği için SSR Hydration Mismatch hatası verir.
   - Bunun yerine tablo içi seçimlerde her zaman stillendirilmiş native HTML `<select>` kullanın:
   ```tsx
   <div className="relative inline-block w-full">
     <select
       value={item.status}
       onChange={(e) => updateStatus(item.id, e.target.value)}
       className="h-8 w-full appearance-none rounded-medium bg-default-100 px-2.5 pr-8 text-xs font-medium text-foreground transition-colors hover:bg-default-200 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer border border-transparent focus:border-primary/50"
     >
       <option value="ACTIVE">Aktif</option>
       <option value="PASSIVE">Pasif</option>
     </select>
     <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-default-400" aria-hidden="true" />
   </div>
   ```
5. ⚠️ **URL Tabanlı Modal ve Server Action Sınırı:**
   - Server Component (`views/*-view.tsx`) içinden istemci bileşenine `onClose={async () => { "use server"; }}` gibi inline server action geçilemez (Build hatası: `It is not allowed to define inline "use server" annotated Server Actions in Client Components`).
   - Modal'ı açmak için URL parametresi (`?action=new`) kullanılır. Modal'ı kapatıp URL'i temizlemek için ise `"use client"` olan `components/<modul>-create-modal.tsx` sarmalayıcısı yazılır ve `useRouter` ile `action` parametresi temizlenir.
6. ⚠️ **Veritabanı Singleton Kuralı:**
   - `@/shared/lib/prisma` veya `new PrismaClient()` ASLA kullanılmaz. Singleton fonksiyon kullanılır:
     `import { getDb } from "@/shared/db";` -> `const db = getDb();`
7. ⚠️ **React 19 Saflık Kuralı:**
   - Render esnasında `Date.now()` veya `new Date()` çağrısı yapılamaz (`react-hooks/purity`). Tarih karşılaştırmaları (`isPast` gibi) sunucudaki sorgularda (`queries/`) hesaplanıp nesneye eklenmelidir.
8. ⚠️ **Resmi İthalat (Import) Yolları Tablosu:**
   Modül geliştirirken çekirdek modüllerden import yaparken şu yollara kesinlikle uyulmalıdır:
   - Veritabanı Singleton: `import { getDb } from "@/shared/db";` -> `const db = getDb();`
   - Yetki Tanımlama (permissions.ts): `import { definePermissions } from "@/shared/permissions/define";`
   - Yetki Denetimi (Server Actions & Queries): `import { requirePermission } from "@/modules/auth/server";`
   - Sayfa Başlığı: `import { PageHeader } from "@/shared/components/ui/page-header";`
   - Boş Durum: `import { EmptyState } from "@/shared/components/ui/empty-state";`
   - Veri Tablosu: `import { DataTable, DataTablePagination } from "@/shared/components/data-table";`
   - Modül Tipleri: `import type { ModuleConfig, TopNavItem } from "@/shared/types/module";`
9. ⚠️ **Sıfır `any` Kuralı (ESLint `@typescript-eslint/no-explicit-any`):**
   - Projede `any` kullanımı kesinlikle yasaktır (`no-explicit-any`).
   - `const db = getDb()` doğrudan tipli `PrismaClient` döner; `pnpm module:sync` sonrası modeller tam tiplidir. Asla `getDb() as any` veya `(db as any)...` yazmayın.
   - Hata bloklarında asla `catch (error: any)` yazmayın. `catch (error: unknown)` veya doğrudan `catch (error)` yazıp `error instanceof Error ? error.message : "..."` kullanın.
   - Dizi fonksiyonlarında `(item: any)` yerine tip çıkarımına güvenin veya modül arayüzlerini kullanın.

---

## 4. Harici AI Agent İçin Özel Geliştirme Prompt Şablonu

Aşağıdaki istemi, **projeye doğrudan terminal/dosya sistemi erişimi olmayan** harici bir yapay zekaya (ChatGPT, Claude web arayüzü vb.) doğrudan verebilirsiniz. Bu istem, AI'a tüm dosyaları eksiksiz dosya yollarıyla üretmesi için rehberlik eder:

```markdown
Sen Verein ERP dernek yönetim sistemi için üretim kalitesinde (production-ready) modül geliştiren uzman bir Full-Stack Next.js 16 / TypeScript / Prisma mühendisisin.
Senden projemiz için `<MODUL_ADI>` (örn: `inventory`, `sponsors`, `events`) adında yeni bir bağımsız modül geliştirmeni istiyorum.

PROJE MİMARİSİ VE SINIR KURALLARI:
1. Dikey Dilim İzolasyonu (Vertical Slice Architecture): Modüle ait tüm dosyalar ve sayfa rotası İSTİSNASIZ `src/modules/<MODUL_ADI>/` altında olmalıdır. `src/app` dizinine ASLA dosya yazma.
2. Sıfır Çekirdek Teması (Zero-Touch Core): `src/registry.ts`, `prisma/schema/base.prisma`, `src/app/` veya kök `messages/` dosyalarına DOKUNMA. Kod yazma.
3. Katı İthalat Sınırları (Strict Imports): Başka bir modülün iç dosyalarını ASLA doğrudan import etme. Yalnızca `@/modules/<modul>`, `@/modules/<modul>/server` ve `@/modules/<modul>/ui` public API'larını kullan. Modül içinden `src/app` katmanını ASLA import etme.
4. Resmi İthalat (Import) Yolları Tablosu:
   - Veritabanı Singleton: `import { getDb } from "@/shared/db";` -> `const db = getDb();` (ASLA `@/shared/lib/prisma` veya `new PrismaClient()` yazma!)
   - Yetki Tanımlama (permissions.ts): `import { definePermissions } from "@/shared/permissions/define";` (ASLA `@/shared/types/permissions` yazma!)
   - Yetki Denetimi (Server Actions & Queries): `import { requirePermission } from "@/modules/auth/server";` (ASLA `@/shared/lib/permissions-service` yazma!)
   - Sayfa Başlığı: `import { PageHeader } from "@/shared/components/ui/page-header";`
   - Boş Durum: `import { EmptyState } from "@/shared/components/ui/empty-state";`
   - Veri Tablosu: `import { DataTable, DataTablePagination } from "@/shared/components/data-table";`
   - Modül Tipleri: `import type { ModuleConfig, TopNavItem } from "@/shared/types/module";`
5. Sıfır "any" Kuralı ve Güçlü Tipleme (ESLint @typescript-eslint/no-explicit-any):
   - Projede ESLint katı `no-explicit-any` kuralı devrededir; `any` kullanımı derlemeyi bozar.
   - ASLA `as any` veya `: any` KULLANMA!
   - `const db = getDb()` doğrudan tipli PrismaClient döndürür. Modül şeması derlendiğinde tablolar tam tiplidir. ASLA `const db = getDb() as any` veya `(db as any)...` yazma!
   - Hata yakalamada ASLA `catch (error: any)` yazma! `catch (error: unknown)` veya doğrudan `catch (error)` yazıp `error instanceof Error ? error.message : "..."` kullan.
   - Dizi işlemlerinde `(item: any) => ...` YERİNE TypeScript tip çıkarımına güven (`(item) => ...`) veya arayüz tiplerini kullan.
6. Server Component (RSC) vs Client Component Sınırı:
   - `views/*-view.tsx` ve `page.tsx` asenkron SERVER COMPONENT'tir (RSC). Başlarına ASLA `"use client"` koyma!
   - Server Component içine ASLA `onClose={async () => { "use server"; }}` gibi inline server action yazma.
   - `@heroui/react` bir Client Component kütüphanesidir. `@heroui/react` bileşenlerini (Button, Modal, Input vb.) YALNIZCA `"use client"` olan `components/*.tsx` dosyalarında kullan. Server Component (`views/*.tsx`) içinde `@heroui/react` import etme (Next.js build `createContext is not a function` hatası verir); bunun yerine Tailwind CSS kullan.
7. "Services", "Helpers", "Queries" ve "Actions" Katı Ayrımı (İnce Görünüm / Thin Views Kuralı):
   - `views/*-view.tsx` dosyalarında KESİNLİKLE hesaplama, matematiksel işlem, formatlama veya karmaşık lojik yazma. View yalnızca bir orkestratördür: parametreyi alır, sorgu/servis/helper'ı çağırır, çıkan sonucu bileşenlere props olarak iletir.
   - **`helpers/`:** Dış dünyaya yan etkisi olmayan saf (pure) fonksiyonlar: oran/kontenjan hesaplamaları, tarih/para formatlama, durum türetme.
   - **`services/`:** Çok adımlı iş süreçleri, dış API entegrasyonları, dosya dışa aktarma (Excel/PDF) motorları.
   - **`queries/`:** Yalnızca veritabanı okuma (SELECT) Prisma sorguları.
   - **`actions/`:** Yalnızca `"use server"` form mutasyonları (`create`, `update`, `delete`).
8. URL Tabanlı Modal Kapatma (`<MODUL_ADI>-create-modal.tsx`):
   - `?action=new` modalını açıp kapatmak için `"use client"` olan bir `components/<MODUL_ADI>-create-modal.tsx` sarmalayıcısı yaz. Bu bileşenin `onClose` fonksiyonu `useRouter` ile URL'deki `action` parametresini temizler.
9. Sayfa Eylem Ayrımı: `PageHeader actions` alanına YALNIZCA doğrudan ana CRUD butonunu (`+ Yeni Ekle`) koy. Araçlar, raporlar ve dışa aktarma bağlantılarını `menu/top.json` içinde tanımla.
10. KRİTİK SSR Hydration & Saflık Kuralları (React 19 / Next.js 16):
   - Tablo satırları (`map`) içinde asla HeroUI'ın `<Select>` bileşenini kullanma. Bunun yerine stillendirilmiş native HTML `<select>` ve yanında Lucide `<ChevronDown>` kullan.
   - Render esnasında `Date.now()` çağırma (`react-hooks/purity`). Tarih karşılaştırmalarını (`isPast` vb.) sorguda (`queries/`) veya saf helper'da (`helpers/`) hesapla.

SENİN ÜRETMEN GEREKEN DOSYALAR:
Lütfen bana her bir dosyanın TAM DOSYA YOLUNU ve EKSİKSİZ ÇALIŞAN KODUNU sırasıyla ver:

1. `src/modules/<MODUL_ADI>/module.config.ts`:
   - `key: "<MODUL_ADI>"`, `category: "EXTENSION"`, `hasSchema: true`, `topNav: topNav as TopNavItem[]`, `nav: [...]` (Lucide ikonu ile).
2. `src/modules/<MODUL_ADI>/menu/top.json`:
   - Üst bar (Mac-tarzı Topbar) araçları, filtreleri veya sekmeleri dizisi (`key`, `label`, `href` ['/' ile başlayan], `icon` [Lucide ikon adı]).
3. `src/modules/<MODUL_ADI>/permissions.ts`:
   - `definePermissions("<MODUL_ADI>", { ADMIN: [...], BOARD: [...], SECRETARY: [...], TREASURER: [...], AUDITOR: [...], VIEWER: [...] })` şeklinde 6 rolü de tanımla.
4. `src/modules/<MODUL_ADI>/schema.prisma`:
   - Veritabanı modeli. Tablo isimlerinde çakışmayı önlemek için mutlaka `@@map("<MODUL_ADI>_...")` kullan. Yumuşak referanslar (`memberId String?`) tercih et.
5. `src/modules/<MODUL_ADI>/messages/tr.json` ve `src/modules/<MODUL_ADI>/messages/de.json`:
   - Başlıklar, butonlar, alanlar, hata mesajları için Türkçe ve Almanca tam çeviri sözlükleri.
6. `src/modules/<MODUL_ADI>/index.ts`:
   - İzomorfik kamuya açık dosya (`moduleConfig`, yetkiler, tipler). KESİNLİKLE 'server-only' içermez.
7. `src/modules/<MODUL_ADI>/server.ts`:
   - Sunucu kamuya açık dosyası. İlk satırında `import "server-only";` bulunmalı. Sorgu ve mutasyonları dışa aktar.
8. `src/modules/<MODUL_ADI>/ui.ts`:
   - UI kamuya açık dosyası. Görünüm bileşenlerini dışa aktar.
9. `src/modules/<MODUL_ADI>/schemas/<MODUL_ADI>-schema.ts`:
   - Zod doğrulama şeması.
10. `src/modules/<MODUL_ADI>/queries/list-<MODUL_ADI>.ts`:
    - `getDb()` ile veritabanından veri çeken sayfalama ve filtreleme destekli sorgu fonksiyonu.
11. `src/modules/<MODUL_ADI>/actions/<MODUL_ADI>-actions.ts`:
    - `"use server"` Server Action mutasyon fonksiyonları (ekleme, güncelleme, silme). `requirePermission` ile yetki denetimi yap.
12. `src/modules/<MODUL_ADI>/components/<MODUL_ADI>-table.tsx`:
    - `"use client"` Tablo bileşeni. SSR Hydration Mismatch hatası vermemesi için tablo satırlarında HeroUI Select YERİNE native HTML `<select>` kullan.
13. `src/modules/<MODUL_ADI>/components/<MODUL_ADI>-form-modal.tsx`:
    - `"use client"` Ekleme / düzenleme modal formu (`@heroui/react` Modal, Input vb.).
14. `src/modules/<MODUL_ADI>/components/<MODUL_ADI>-create-modal.tsx`:
    - `"use client"` URL query (`?action=new`) yöneten modal sarmalayıcısı.
15. `src/modules/<MODUL_ADI>/views/<MODUL_ADI>-list-view.tsx`:
    - Saf asenkron Server Component (RSC). `"use client"` İÇERMEZ. `PageHeader`, arama filtreleri, istatistik kartları, `<MODUL_ADI>-table` ve `<MODUL_ADI>-create-modal` bileşenlerini render eder.
16. `src/modules/<MODUL_ADI>/page.tsx`:
    - Modülün Next.js Server Component sayfası. NOT: `src/app` dizinine ASLA kod yazma; sistem `pnpm module:sync` ile Next.js App Router köprüsünü otomatik oluşturur.

Lütfen kodları placeholder veya "TODO" bırakmadan, çalışmaya hazır ve eksiksiz olarak üret.
```

---

## 5. Modül Dosyaları Oluşturulduktan Sonraki Adımlar

Geliştirici veya AI dosyaları projeye ekledikten sonra terminalde şu 3 komutu koşturarak modülü anında canlıya alır:

```bash
# 1. Modülün şemasını, çevirilerini ve registry kaydını sisteme otomatik bağla
pnpm module:sync

# 2. Modülün standartlara ve import kurallarına uygunluğunu doğrula
pnpm module:validate <MODUL_ADI>

# 3. Tip kontrolünü ve testleri koştur
pnpm typecheck
pnpm test
```
