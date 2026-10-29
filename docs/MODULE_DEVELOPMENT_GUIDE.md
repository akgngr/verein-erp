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
4. **Modül Menüsü Standardı (sol panel, `module.config.ts` → `menu`):**
   Her modülün alt sayfaları, modüle özel yapılandırmaları ve dışa aktarma (Excel vb.) araçları sayfa içine buton yığılması yerine `module.config.ts` içindeki `menu` dizisinde bildirilir. Üst bar yoktur: kullanıcı sol panelde modüle girdiğinde ana menü kayarak modülün menüsüne dönüşür (en üstte "Ana menü" butonu); ana menüye dönüldüğünde en üstte modüle geri dönme butonu çıkar. Modülün ana sayfası ("Genel bakış") otomatik eklenir. (Eski `menu/top.json` standardı kaldırılmıştır; doğrulayıcı hata verir.)
5. **Sayfa Eylem Ayrımı Kuralı (UI Action Area Separation):**
   - **Sayfa Başlığı Eylem Alanı (`PageHeader actions`):** YALNIZCA doğrudan ana CRUD butonuna (`+ Yeni Ekle`) ayrılmıştır.
   - **Araçlar, Raporlar ve Alt Sayfa Bağlantıları:** `module.config.ts` içindeki `menu` dizisinde tanımlanır; sayfa gövdesinde mükerrer buton olarak gösterilmez.

---

## 2. Eksiksiz Modül Klasör Ağacı (Complete Tree Structure)

Projeye terminal erişimi olmayan bir AI, aşağıdaki tüm klasörleri ve dosyaları doğrudan oluşturmalıdır:

```text
src/
├── app/
│   └── (dashboard)/
│       └── <modul_adi>/                      # Örn: inventory
│           └── page.tsx                      # Dashboard rota sayfası (RSC)
│
└── modules/
    └── <modul_adi>/                          # Örn: inventory
        ├── module.config.ts                  # Modül meta verisi, sidebar menü tanımı, yetki bağlamı
        ├── permissions.ts                   # definePermissions ile rol bazlı yetki matrisi
        ├── schema.prisma                    # Modülün Prisma veritabanı modelleri
        ├── index.ts                         # Kamuya açık İZOMORFİK giriş noktası (Public API)
        ├── server.ts                        # Kamuya açık SUNUCU giriş noktası ("server-only")
        ├── ui.ts                            # Kamuya açık UI bileşenleri girişi
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
        ├── queries/                         # Salt-okunur veritabanı sorguları (RSC için)
        │   └── list-<modul_adi>.ts          # Sayfalanmış listeleme sorgusu
        │
        ├── actions/                         # Server Actions ("use server" form aksiyonları)
        │   └── <modul_adi>-actions.ts       # Ekleme, güncelleme, silme mutasyonları
        │
        ├── components/                      # Modüle özel React bileşenleri
        │   ├── <modul_adi>-table.tsx        # DataTable listeleme tablosu
        │   └── <modul_adi>-form-modal.tsx   # Ekleme / düzenleme modal formu
        │
        └── views/                           # Sayfa düzeyinde Server Component görünümleri
            └── <modul_adi>-list-view.tsx    # Ana listeleme görünümü
```

---

## 3. Adım Adım Dosya Şablonları & Kurallar

### 1. `module.config.ts` (Modül Kimliği ve Menüsü)
```typescript
import { Download, FolderTree, Package } from "lucide-react"; // İlgili Lucide ikonları
import type { ModuleConfig } from "@/shared/types/module";
import { inventoryPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "inventory",                       // Klasör adıyla BİREBİR AYNI olmalıdır
  label: "Envanter",                      // Modülün görünen adı (TR)
  description: "Dernek demirbaş ve malzeme takibi.",
  category: "EXTENSION",                  // Eklentiler için 'EXTENSION', sistem için 'CORE'/'OFFICIAL'
  hasSchema: true,                        // Veritabanı tablosu varsa true
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
  // Modül menüsü (sol panel). Ana sayfa ("Genel bakış") otomatik eklenir, burada tekrar edilmez.
  menu: [
    { key: "categories", label: "Kategoriler", href: "/inventory/kategoriler", icon: FolderTree },
    { key: "export", label: "Excel'e aktar", href: "/api/inventory/export", icon: Download, isDownload: true },
  ],
};
```

---

### 2. `menu` (Sol Panel Modül Menüsü)
Sayfada buton kalabalığı yaratmak yerine alt sayfalar, araçlar ve Excel dışa aktarımı `module.config.ts` içindeki `menu` dizisinde tanımlanır (örnek yukarıda). Kurallar:

- **Ana sayfa tekrar edilmez:** `nav[0].href` "Genel bakış" olarak otomatik eklenir. Ana sayfanın farklı bir adı olacaksa (örn. E-posta: `/mail` = "Ayarlar") aynı `href` ile bir öğe tanımlanır, o zaman otomatik öğe eklenmez.
- **Yetki:** Her öğe, hedef sayfanın gerçekten kontrol ettiği yetkiyi `permission: { definition, action }` ile taşır; verilmezse modülün `nav[0]` yetkisi kullanılır. Yetkisi olmayan kullanıcı bağlantıyı görmez.
- **Çeviri:** Etiket `messages/tr.json` ve `messages/de.json` içinde `"menu": { "<key>": "..." }` altında tanımlanır; `label` yalnızca yedektir.
- **Sorgu parametresi:** `href` sorgu içerebilir (örn. `/events?filter.timeFilter=upcoming`); bağlantı yalnızca parametre eşleşince aktif görünür.
- **İndirme:** API rotaları (`/api/...`) `isDownload: true` ile işaretlenir.
- **Denetim:** `tests/navigation.test.ts` her bağlantının bir sayfası (`page.tsx`) veya API rotası (`route.ts`) olduğunu ve her etiketin iki dilde çevrildiğini doğrular. Sayfası olmayan link CI'ı kırmızıya çevirir.

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

### 7. Dashboard Sayfası (`src/app/(dashboard)/<modul_adi>/page.tsx`)
```typescript
import { InventoryListView } from "@/modules/inventory/ui";

export const metadata = { title: "Envanter" };

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <InventoryListView searchParams={searchParams} />;
}
```

---

### 8. UI, Tablolar ve KRİTİK SSR Hydration Kuralı
- **Sayfa Başlığı Eylem Alanı (`PageHeader actions`):** Sadece ana CRUD butonunu barındırır.
- **Tablolar:** `@/shared/components/data-table` bileşenleri (`DataTable`, `DataTablePagination`) kullanılır.
- ⚠️ **KRİTİK SSR HYDRATION KURALI (React 19 / Next.js 16):**
  Tablo satırları (`map`) veya dinamik listeler içinde asla HeroUI'ın `<Select>` bileşenini kullanmayın. HeroUI Select rastgele dinamik `react-aria` kimlikleri ürettiği için SSR Hydration Mismatch hatası verir.
  Bunun yerine tablo içi seçimlerde her zaman stillendirilmiş native HTML `<select>` kullanın:
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

---

## 4. Harici AI Agent İçin Özel Geliştirme Prompt Şablonu

Aşağıdaki istemi, **projeye doğrudan terminal/dosya sistemi erişimi olmayan** harici bir yapay zekaya (ChatGPT, Claude web arayüzü vb.) doğrudan verebilirsiniz. Bu istem, AI'a tüm dosyaları eksiksiz dosya yollarıyla üretmesi için rehberlik eder:

```markdown
Sen Verein ERP dernek yönetim sistemi için üretim kalitesinde (production-ready) modül geliştiren uzman bir Full-Stack Next.js 16 / TypeScript / Prisma mühendisisin.
Senden projemiz için `<MODUL_ADI>` (örn: `inventory`, `sponsors`, `events`) adında yeni bir bağımsız modül geliştirmeni istiyorum.

PROJE MİMARİSİ VE SINIR KURALLARI:
1. Dikey Dilim İzolasyonu (Vertical Slice Architecture): Modüle ait tüm dosyalar `src/modules/<MODUL_ADI>/` altında ve rota sayfası `src/app/(dashboard)/<MODUL_ADI>/page.tsx` altında olmalıdır.
2. Sıfır Çekirdek Teması (Zero-Touch Core): `src/registry.ts`, `prisma/schema/base.prisma` veya kök `messages/` dosyalarına DOKUNMA. Kod yazma.
3. Katı İthalat Sınırları (Strict Imports): Başka bir modülün iç dosyalarını ASLA doğrudan import etme. Yalnızca `@/modules/<modul>`, `@/modules/<modul>/server` ve `@/modules/<modul>/ui` public API'larını kullan. Modül içinden `src/app` katmanını ASLA import etme.

SENİN ÜRETMEN GEREKEN DOSYALAR:
Lütfen bana her bir dosyanın TAM DOSYA YOLUNU ve EKSİKSİZ ÇALIŞAN KODUNU sırasıyla ver:

1. `src/modules/<MODUL_ADI>/module.config.ts`:
   - `key: "<MODUL_ADI>"`, `category: "EXTENSION"`, `hasSchema: true`, `nav: [...]` (Lucide ikonu ile), alt sayfa varsa `menu: [...]` (`key`, `label`, `href` ['/' ile başlayan], `icon` [Lucide bileşeni], gerekirse `permission`, indirme için `isDownload: true`).
2. (Kaldırıldı — modül menüsü artık `module.config.ts` içindeki `menu` dizisindedir.)
3. `src/modules/<MODUL_ADI>/permissions.ts`:
   - `definePermissions("<MODUL_ADI>", { ADMIN: [...], BOARD: [...], SECRETARY: [...], TREASURER: [...], AUDITOR: [...], VIEWER: [...] })` şeklinde 6 rolü de tanımla.
4. `src/modules/<MODUL_ADI>/schema.prisma`:
   - Veritabanı modeli. Tablo isimlerinde çakışmayı önlemek için mutlaka `@@map("<MODUL_ADI>_...")` kullan.
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
    - Prisma ile veritabanından veri çeken sayfalama ve filtreleme destekli sorgu fonksiyonu.
11. `src/modules/<MODUL_ADI>/actions/<MODUL_ADI>-actions.ts`:
    - `"use server"` Server Action mutasyon fonksiyonları (ekleme, güncelleme, silme). `requirePermission` ile yetki denetimi yap.
12. `src/modules/<MODUL_ADI>/components/<MODUL_ADI>-table.tsx`:
    - Tablo bileşeni. SSR Hydration Mismatch hatası vermemesi için tablo satırlarında HeroUI Select YERİNE native HTML `<select>` kullan.
13. `src/modules/<MODUL_ADI>/views/<MODUL_ADI>-list-view.tsx`:
    - `PageHeader` (actions kısmında yalnızca `+ Yeni Ekle` butonu olmalı) ve tabloyu render eden ana RSC görünümü.
14. `src/app/(dashboard)/<MODUL_ADI>/page.tsx`:
    - Sayfa rotası.

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
