# Verein ERP — Modül Geliştirme Rehberi & Dış AI Agent Şartnamesi

Bu belge, **Verein ERP** projesine yeni bir modül eklemek isteyen harici geliştiriciler veya otonom AI agent'lar (Claude, GPT, Gemini vb.) için hazırlanmış standart mimari kurallarını ve geliştirme adımlarını içerir.

---

## 1. Temel Mimari Prensipler (Sıfır Bağımlılık)

1. **İzole Modül Dizini**: Tüm yeni modüller `src/modules/<modul_adi>/` altında kendi kendine yeten bağımsız bir paket olarak geliştirilir.
2. **Çekirdek Koda Sıfır Dokunuş (Zero-Touch Core)**: Çekirdek dosyalara (`src/registry.ts`, `prisma/schema/*`, `messages/*.json`) elle ekleme yapılması **yasaktır**. Otomasyon scriptleri bu dosyaları modülünüzden otomatik olarak türetir.
3. **Katı İçe Aktarma Sınırları (`eslint.config.mjs`)**:
   - Bir modül, başka bir modülün iç dosyalarını (örn. `@/modules/x/queries/y`) ASLA import edemez.
   - Sadece şu 3 public giriş noktası serbesttir:
     - `@/modules/<modul>` (`index.ts` — izomorfik tipler, şemalar, config)
     - `@/modules/<modul>/server` (`server.ts` — server-only eylemler, sorgular)
     - `@/modules/<modul>/ui` (`ui.ts` — React istemci/sunucu görünüm bileşenleri)
4. **Çoklu Dil (i18n) Standardı**: Modüle ait tüm çeviriler modülün içindeki `messages/tr.json` ve `messages/de.json` dosyalarında yer almalıdır.

---

## 2. Modül Dosya Yapısı

Yeni bir modül (`src/modules/<modul_adi>/`) aşağıdaki dosya yapısına sahip olmalıdır:

```
src/modules/<modul_adi>/
├── module.config.ts        # Modül meta verisi, sidebar menü öğeleri, yetki bağlamı
├── permissions.ts         # definePermissions ile rol yetki tanımları
├── schema.prisma          # (Varsa) Modüle özel Prisma veritabanı modelleri
├── prisma/
│   └── schema.prisma      # (Sembolik bağlantı veya kopya)
├── messages/
│   ├── tr.json            # Türkçe metinler
│   └── de.json            # Almanca metinler
├── index.ts               # İzomorfik public API (tipler, yetki, config)
├── ui.ts                  # Public UI bileşenleri dışa aktarımı
├── server.ts              # "server-only" sorgu ve sunucu aksiyonları dışa aktarımı
├── queries/               # Prisma veri okuma fonksiyonları ("server-only")
├── actions/               # Server Actions (form gönderme, mutasyonlar)
├── schemas/               # Zod doğrulama şemaları ve TypeScript tipleri
├── components/            # Modüle özel React bileşenleri
└── views/                 # Sayfa düzeyinde görünüm bileşenleri
```

Ayrıca sayfa rotası için tek bir dosya eklenir:
- `src/app/(dashboard)/<modul_adi>/page.tsx`

---

## 3. Adım Adım Modül Oluşturma

### Yöntem A: Hızlı Başlangıç (Scaffold CLI)

Yeni bir modülü tek komutla tüm standart dosyalarıyla oluşturabilirsiniz:

```bash
pnpm module:create <modul_adi> "Modül Başlığı"
```

*Örnek:*
```bash
pnpm module:create inventory "Envanter ve Demirbaş"
```

Bu komut:
1. `src/modules/inventory/` klasörünü ve tüm gerekli şablon dosyaları oluşturur.
2. `src/app/(dashboard)/inventory/page.tsx` rotasını açar.
3. Otomatik senkronizasyonu çalıştırarak `src/registry.ts`, `prisma/schema/inventory.prisma` ve dil dosyalarını bağlar.

---

### Yöntem B: Manuel veya AI Agent Tarafından Oluşturma

Bir AI Agent modülü sıfırdan oluştururken aşağıdaki 5 temel dosyayı hazırlar:

#### 1. `module.config.ts`
```typescript
import { Package } from "lucide-react";
import type { ModuleConfig } from "@/shared/types/module";
import { inventoryPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "inventory",
  label: "Envanter",
  description: "Dernek demirbaş ve malzeme takibi.",
  category: "EXTENSION", // 'CORE' | 'OFFICIAL' | 'EXTENSION'
  hasSchema: true,
  nav: [
    {
      href: "/inventory",
      label: "Envanter",
      labelKey: "inventory", // messages/*.json içinde nav.inventory olarak çözülür
      icon: Package,
      group: "main",         // 'main' veya 'settings'
      order: 10,
      permission: { definition: inventoryPermissions, action: "view" },
    },
  ],
};
```

#### 2. `permissions.ts`
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

#### 3. `schema.prisma`
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

#### 4. `messages/tr.json` ve `messages/de.json`
```json
// messages/tr.json
{
  "title": "Envanter Yönetimi",
  "newItem": "Yeni Demirbaş",
  "emptyTitle": "Demirbaş kaydı bulunamadı."
}
```

#### 5. `ui.ts`, `server.ts` ve `index.ts`
```typescript
// ui.ts
export { InventoryListView } from "./views/inventory-list-view";

// server.ts
import "server-only";
export { inventoryPermissions } from "./permissions";

// index.ts
export { inventoryPermissions } from "./permissions";
export { moduleConfig } from "./module.config";
```

---

## 4. Senkronizasyon ve Doğrulama

Modül dosyaları yazıldıktan sonra senkronizasyonu çalıştırın:

```bash
pnpm module:sync
```

Bu komut:
- `prisma/schema/<modul_adi>.prisma` sembolik bağlantısını kurar.
- Modül çevirilerini ana dil dosyalarına derinlemesine enjekte eder.
- `src/registry.ts` dosyasını otomatik olarak günceller.

Ardından veritabanını ve testleri doğrulayın:

```bash
pnpm typecheck   # TypeScript derleme kontrolü
pnpm lint        # ESLint modül sınırları denetimi
pnpm test        # Test paketlerinin doğrulanması
pnpm db:migrate  # Veritabanı şema göçünün oluşturulması
```

---

## 5. Dış AI Agent'a Verilecek Görev İstemi (Prompt Şablonu)

Başka bir yapay zekaya (Cursor, Windsurf, Claude, ChatGPT vb.) modül geliştirmesi yaptırmak istediğinizde aşağıdaki istemi doğrudan kopyalayıp verebilirsiniz:

> **İstem (Prompt):**
> "Verein ERP projesine `<modul_adi>` isimli yeni bir eklenti modülü geliştirmeni istiyorum.
> Projede katı modüler mimari uygulanmaktadır (`docs/MODULE_DEV_GUIDE.md`).
> Kurallar:
> 1. Sadece `src/modules/<modul_adi>/` dizini ve `src/app/(dashboard)/<modul_adi>/page.tsx` üzerinde çalış.
> 2. `src/registry.ts`, `prisma/schema/base.prisma` veya `messages/` kök dosyalarını elle DÜZENLEME; `pnpm module:sync` çalıştırarak otomatik bağlanmasını sağla.
> 3. Modülün içinde `module.config.ts`, `permissions.ts`, `schema.prisma`, `messages/tr.json`, `messages/de.json`, `index.ts`, `ui.ts` ve `server.ts` dosyalarını eksiksiz oluştur.
> 4. Başka bir modülden kod çağırırken sadece public giriş noktalarını kullan (`@/modules/<modul>`, `@/modules/<modul>/ui`, `@/modules/<modul>/server`).
> 5. İşi bitirdikten sonra `pnpm module:sync`, `pnpm typecheck` ve `pnpm lint` komutlarını çalıştırarak doğrula."
