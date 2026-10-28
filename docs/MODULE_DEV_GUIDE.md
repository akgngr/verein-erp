# Verein ERP — Modül Geliştirme Rehberi & Dış AI Şartnamesi
> **Sürüm:** 2.0 (Standardize Edilmiş Mimari)  
> **Hedef Kitle:** Harici AI Agent'lar (Claude, ChatGPT, Gemini, Cursor, Windsurf) ve Bağımsız Geliştiriciler

Bu rehber, **Verein ERP** sistemine diğer modülleri ve çekirdek sistemi bozmadan, sıfır temas (zero-touch) prensibiyle çalışan yeni bir modül eklemek için gereken standartları, dosya yapısını, denetim araçlarını ve hazır yapay zeka istemini (prompt) içerir.

---

## 1. Temel Mimari Prensipler (Architecture Principles)

1. **Sıfır Çekirdek Dokunuşu (Zero-Touch Core):**
   Yeni bir modül geliştirirken veya mevcut bir modülü silerken çekirdek dosyalara (`src/registry.ts`, `prisma/schema/*`, `messages/*.json`) **ASLA ELLE MÜDAHALE EDİLMEZ**. Tüm kayıtlar ve bağlantılar `pnpm module:sync` otomasyon scripti tarafından dinamik olarak yönetilir.

2. **Dikey Dilim İzolasyonu (Vertical Slice Isolation):**
   Modüle ait veritabanı şeması, iş kuralları, yetki tanımları, çevirileri, sayfaları ve bileşenleri tamamen `src/modules/<modul_adi>/` dizini içinde yer alır.

3. **Katı Kamu API Sınırları (Public API Boundary - `eslint.config.mjs`):**
   Bir modülün iç klasörleri (`queries/`, `actions/`, `components/`, `views/`, `services/`) **özeldir (private)**. Dış dünyaya ve diğer modüllere yalnızca şu 3 kamuya açık dosya üzerinden konuşur:
   - `@/modules/<modul>` (`index.ts` — İzomorfik tipler, şemalar, yetki tanımları, moduleConfig)
   - `@/modules/<modul>/server` (`server.ts` — "server-only" sorgular, sunucu aksiyonları, yetki korumaları)
   - `@/modules/<modul>/ui` (`ui.ts` — React istemci ve sunucu görünüm bileşenleri)
   *(Not: `@/modules/auth/edge` yalnızca middleware için geçerli özel bir istisnadır).*

4. **Üst Bar Menüsü Standardı (`menu/top.json`):**
   Her modülün alt sayfaları, modüle özel yapılandırmaları ve dışa aktarma (Excel vb.) araçları sayfa içine buton yığılması yerine modül dizinindeki `menu/top.json` dosyasında bildirilir ve dinamik Mac-tarzı üst barda gösterilir.

5. **Sayfa Eylem Ayrımı Kuralı (UI Action Area Separation):**
   - **Sayfa Başlığı Eylem Alanı (`PageHeader actions`):** YALNIZCA doğrudan ana CRUD butonuna (`+ Yeni Üye`, `+ Fiş Ekle`, `+ Yeni Bağış`) ayrılmıştır.
   - **Araçlar, Raporlar ve Alt Sayfa Bağlantıları:** `menu/top.json` içinde tanımlanır; sayfa gövdesinde mükerrer buton olarak gösterilmez.

---

## 2. Modül Anatomisi (Standart Klasör & Dosya Yapısı)

Yeni bir modül (`src/modules/<modul_adi>/`) aşağıdaki standart dosya ağacına sahip olmalıdır:

```
src/modules/<modul_adi>/
├── module.config.ts        # Modül meta verisi, sidebar menü tanımı, yetki bağlamı
├── menu/
│   └── top.json           # [STANDART] Üst bar araçları, alt sekmeler ve dışa aktarma linkleri
├── permissions.ts         # definePermissions ile rol bazlı yetki matrisi
├── schema.prisma          # (Varsa) Prisma veritabanı modelleri
├── messages/
│   ├── tr.json            # Türkçe yerelleştirilmiş metinler
│   └── de.json            # Almanca yerelleştirilmiş metinler (Verein terminolojisi)
├── index.ts               # Kamuya açık İZOMORFİK giriş noktası (Public API)
├── server.ts              # Kamuya açık SUNUCU giriş noktası ("server-only")
├── ui.ts                  # Kamuya açık UI bileşenleri girişi
├── types.ts               # Modül içi tipler ve arayüzler
├── constants.ts           # Filtre sabitleri, sıralama alanları, varsayılanlar
├── queries/               # Salt-okunur veritabanı sorguları (RSC için)
├── actions/               # Server Actions (form gönderme, mutasyonlar)
├── schemas/               # Zod doğrulama şemaları
├── components/            # Modüle özel React bileşenleri
└── views/                 # Sayfa düzeyinde Server/Client görünümleri
```

Ayrıca modülün dashboard rotası için tek bir dosya eklenir:
- `src/app/(dashboard)/<modul_adi>/page.tsx`

---

## 3. Standart Dosyaların Detaylı Şartnamesi

### 1. `module.config.ts`
Modülün kimliğini, kategorisini ve menü konumunu belirler.
```typescript
import { Package } from "lucide-react";
import type { ModuleConfig, TopNavItem } from "@/shared/types/module";
import { inventoryPermissions } from "./permissions";
import topNav from "./menu/top.json";

export const moduleConfig: ModuleConfig = {
  key: "inventory",
  label: "Envanter",
  description: "Dernek demirbaş ve malzeme takibi.",
  category: "EXTENSION", // 'CORE' | 'OFFICIAL' | 'EXTENSION'
  hasSchema: true,
  topNav: topNav as TopNavItem[],
  nav: [
    {
      href: "/inventory",
      label: "Envanter",
      labelKey: "inventory", // messages/ içinde nav.<key> olarak çözülür
      icon: Package,
      group: "main",         // 'main' veya 'settings'
      order: 10,
      permission: { definition: inventoryPermissions, action: "view" },
    },
  ],
};
```

### 2. `menu/top.json`
Modül açıkken üst barda yer alacak sekmeler ve araçlar.
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

### 3. `permissions.ts`
6 temel sistem rolünü (`ADMIN`, `BOARD`, `SECRETARY`, `TREASURER`, `AUDITOR`, `VIEWER`) eksiksiz kapsamalıdır.
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

### 4. `schema.prisma`
Eklenti tablolarının ad çakışmasını engellemek için `@@map("<modul_adi>_...")` kuralı zorunludur.
```prisma
model InventoryItem {
  id          String   @id @default(uuid())
  title       String
  quantity    Int      @default(1)
  location    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("inventory_items")
}
```

### 5. `messages/tr.json` ve `messages/de.json`
```json
// messages/tr.json
{
  "title": "Envanter Yönetimi",
  "newItem": "Yeni Demirbaş",
  "emptyTitle": "Demirbaş kaydı bulunamadı."
}
```

### 6. Public Giriş Noktaları (`index.ts`, `server.ts`, `ui.ts`)
```typescript
// index.ts (İzomorfik — 'server-only' KESİNLİKLE İÇEREMEZ)
export { moduleConfig } from "./module.config";
export { inventoryPermissions } from "./permissions";

// server.ts (Sunucu — 'server-only' ZORUNLUDUR)
import "server-only";
export { inventoryPermissions } from "./permissions";
export { listInventoryItems } from "./queries/list-inventory";
export { createInventoryAction } from "./actions/create-inventory";

// ui.ts (Görünümler ve UI bileşenleri)
export { InventoryListView } from "./views/inventory-list-view";
```

### 7. Dashboard Sayfası (`src/app/(dashboard)/<modul_adi>/page.tsx`)
```typescript
import { InventoryListView } from "@/modules/inventory/ui";

export const metadata = { title: "Envanter" };

export default async function InventoryPage() {
  return <InventoryListView />;
}
```

---

## 4. Modül Kategorileri ve Yaşam Döngüsü

| Kategori | Tanım | Örnekler | Pasife Alınabilir mi? | Silinebilir mi? |
|---|---|---|:---:|:---:|
| **CORE** | Sistem altyapısı ve çekirdek ayarlar | `auth`, `users`, `organization`, `audit`, `system` | ❌ Hayır | ❌ Hayır |
| **OFFICIAL** | Verein ERP yerleşik dernek fonksiyonları | `members`, `accounting`, `documents`, `meetings`, `donations` | ✅ Evet | ❌ Hayır |
| **EXTENSION** | Bağımsız eklentiler / AI tarafından eklenen modüller | `inventory`, `sponsors`, `events` vb. | ✅ Evet | ✅ Evet |

---

## 5. CLI Komutları & Otomasyon Araçları

Verein ERP, modül geliştirme sürecini hatasız ve otomatik kılmak için özel CLI araçları sunar:

| Komut | Açıklama |
|---|---|
| `pnpm module:create <ad> [Başlık]` | Standart dosyalarıyla birlikte sıfırdan yeni modül iskeleti üretir ve sisteme bağlar. |
| `pnpm module:sync` | Modül şemalarını (`prisma/schema/`), çevirileri (`messages/`) ve `src/registry.ts` dosyasını otomatik eşitler. |
| `pnpm module:validate [ad]` | Bir modülü veya tüm modülleri mimari standartlara, kural ihlallerine ve import sınırlarına göre denetler. |
| `pnpm typecheck` | TypeScript derleme ve tip doğrulamasını çalıştırır. |
| `pnpm lint` | Katı içe aktarma sınırlarını (ESLint) kontrol eder. |
| `pnpm test` | Otomatik modül standart testleri dahil tüm test paketini koşturur. |

---

## 6. Harici AI Agent'a Verilecek Görev İstemi (Prompt Template)

Başka bir yapay zekaya (Claude, Cursor, ChatGPT, Windsurf, Gemini vb.) yeni bir modül geliştirmesi yaptırmak istediğinizde aşağıdaki istemi doğrudan kopyalayıp verebilirsiniz. Bu istem, AI agent'ın projede hata yapmasını (SSR Hydration mismatch, server-only sızıntısı, bozuk importlar vb.) engelleyecek tüm ayrıntılı talimatları içerir:

```markdown
Sen Verein ERP projesi için üretim kalitesinde (production-ready) modül geliştiren kıdemli bir Next.js / TypeScript yazılım agent'ısın.
Senden projemize `<MODUL_ADI>` (örn: `inventory`, `sponsors`, `events`) isimli yeni bir eklenti modülü geliştirmeni istiyorum.

Projede dikey dilim izolasyonu (Vertical Slice Architecture) ve katı modül sınırları uygulanmaktadır (`docs/MODULE_DEV_GUIDE.md`).

AŞAĞIDAKİ ŞARTNAME VE KURALLARA KESİNLİKLE UYMALISIN:

1. İZOLASYON VE SIFIR ÇEKİRDEK TEMASI (ZERO-TOUCH CORE):
   - Yalnızca `src/modules/<MODUL_ADI>/` klasörü ve `src/app/(dashboard)/<MODUL_ADI>/page.tsx` rotası üzerinde çalış.
   - `src/registry.ts`, `prisma/schema/base.prisma` veya kök `messages/` dosyalarına ELLE DOKUNMA! Bunlar `pnpm module:sync` tarafından otomatik yönetilir.

2. BAŞLANGIÇ ADIMI (SCAFFOLD):
   - İşe başlarken önce `pnpm module:create <MODUL_ADI> "Modül Başlığı"` komutunu çalıştırarak temel iskeleti otomatik üret.

3. ZORUNLU DOSYA YAPISI VE KURALLAR:
   - `module.config.ts`:
     - `key: "<MODUL_ADI>"`
     - `category: "EXTENSION"`
     - `hasSchema: true`
     - `topNav: topNav as TopNavItem[]` (menu/top.json dosyasından import edilerek)
     - `nav: [...]` (Sidebar menü tanımı, ikon `lucide-react` üzerinden)
   - `menu/top.json`:
     - Üst barda (Topbar) yer alacak araçlar ve sekmeler dizisi (`key`, `label`, `href` ['/' ile başlayan], `icon` [Lucide ikon adı string olarak]).
   - `permissions.ts`:
     - `definePermissions("<MODUL_ADI>", { ADMIN: [...], BOARD: [...], SECRETARY: [...], TREASURER: [...], AUDITOR: [...], VIEWER: [...] })` şeklinde tüm 6 rolü tanımla.
   - `schema.prisma`:
     - Modülün veritabanı modellerini yaz.
     - Çakışmaları önlemek için TÜM modellerde `@@map("<MODUL_ADI>_...")` kuralına uy (örn: `@@map("inventory_items")`).
     - Yumuşak referans (Soft reference) kullan: Başka modüllerin tablolarına zorlayıcı FK / @relation yazmak yerine `memberId String?` gibi alanlar tut.
   - `messages/tr.json` ve `messages/de.json`:
     - Modülün tüm buton, tablo başlığı, form alanı ve hata mesajlarının hem Türkçe hem Almanca karşılıklarını eksiksiz yaz.
   - Public API Giriş Noktaları:
     - `index.ts`: İzomorfik public API (`moduleConfig`, yetkiler, tipler). KESİNLİKLE 'server-only' içermez.
     - `server.ts`: Sunucu public API (dosyanın ilk satırında `import "server-only";` bulunmalı).
     - `ui.ts`: Dışa aktarılan React görünümleri.
   - `queries/`:
     - Prisma sorgularını barındırır. Sayfalama, filtreleme ve arama için `src/shared/list-params` yardımcılarını kullan.
   - `actions/`:
     - Form mutasyonları için Server Actions (`"use server"`). Girişleri Zod şemasıyla doğrula, `requirePermission` ile yetki kontrolü yap, `revalidatePath` ile sayfayı tazele.

4. KATI İTHALAT (IMPORT) SINIRLARI (`eslint.config.mjs`):
   - Başka modüllerin iç dosyalarını (örn: `@/modules/members/queries/...`, `@/modules/auth/components/...`) ASLA import etme!
   - Sadece public girişleri kullan:
     - `@/modules/<modul>` (tipler)
     - `@/modules/<modul>/server` (sunucu fonksiyonları / eylemleri)
     - `@/modules/<modul>/ui` (UI bileşenleri)
   - Modül içinden `src/app` katmanını ASLA import etme.

5. UI, FORMLAR VE HYDRATION KURALLARI:
   - **Sayfa Eylem Ayrımı:** Sayfa başlığı eylem alanına (`PageHeader actions`) YALNIZCA doğrudan ana CRUD butonunu (`+ Yeni Ekle`) koy. Araçlar, raporlar ve dışa aktarma butonlarını `menu/top.json` içinde tanımla.
   - **Tablolar:** Tablo listelemelerinde `@/shared/components/data-table` (`DataTable`, `DataTableToolbar`) bileşenlerini kullan.
   - **KRİTİK SSR HYDRATION KURALI:** Tablo hücreleri veya döngü içinde (`map`) dinamik açılır menü gerektiğinde HeroUI'ın `<Select>` bileşenini KULLANMA! Bunun yerine stillendirilmiş native HTML `<select className="h-8 appearance-none rounded-medium bg-default-100 px-2.5 pr-8 text-xs font-medium text-foreground transition-colors hover:bg-default-200 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer border border-transparent focus:border-primary/50">` ve yanında Lucide `<ChevronDown>` kullan. (Bu kural React 19 / Next.js 16 SSR ID hydration mismatch hatalarını önler). HeroUI `<Select>` sadece bağımsız form pencerelerinde/modallarda kullanılabilir.

6. DOĞRULAMA VE TEST ADIMLARI:
   Geliştirmeni bitirdikten sonra sırasıyla şu komutları çalıştır ve sıfır hata alana kadar tamamla:
   1. `pnpm module:sync`   -> Şemaları, çevirileri ve registry'yi bağlar
   2. `pnpm module:validate <MODUL_ADI>` -> Mimari standart denetimi yapar
   3. `pnpm typecheck`     -> TypeScript tip kontrolü
   4. `pnpm lint`          -> Katı ESLint sınır denetimi
   5. `pnpm test`          -> Sistem testlerini koşturur
```
