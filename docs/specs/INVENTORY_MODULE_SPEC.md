# Verein ERP — Envanter ve Demirbaş Modülü (Inventory) Geliştirme Şartnamesi
> **Hedef:** Bu şartnameyi doğrudan harici bir yapay zekaya (ChatGPT, Claude, Cursor, Windsurf vb.) vererek `inventory` modülünün eksiksiz ve üretim standartlarında üretilmesini sağlayabilirsiniz.

---

## 📋 AI'ya Kopyalanıp Verilecek Hazır Şartname & Görev İstemi

```markdown
Sen Verein ERP dernek yönetim sistemi için üretim kalitesinde (production-ready) modül geliştiren kıdemli bir Full-Stack Next.js 16 / TypeScript / Prisma mühendisisin.
Senden projemiz için dernek demirbaşlarını, teknik ekipmanları ve zimmet kayıtlarını takip eden "inventory" (Envanter) modülünü geliştirmeni istiyorum.

Projede katı dikey dilim izolasyonu (Vertical Slice Architecture) ve modül kamu sınırları uygulanmaktadır.

================================================================================
1. MODÜL İŞLEVSELLİĞİ & GEREKSİNİMLERİ
================================================================================
- Modül Anahtarı (Key): "inventory"
- Başlık: "Envanter ve Demirbaş" (TR) / "Inventar & Sachmittel" (DE)
- İkon: Package (lucide-react)
- Temel Özellikler:
  1. Demirbaş Kaydı (Adı, Kategori [Elektronik, Mobilya, Mutfak, Ofis, Spor, Diğer], Seri No, Konum/Oda, Adet, Durum [Kullanımda, Boşta, Arızalı, Hurda], Alım Tarihi, Alım Bedeli, Açıklama).
  2. Zimmet Takibi (Opsiyonel: hangi üyeye zimmetlendiği - `assignedMemberId` soft reference).
  3. Arama, Kategoriye ve Duruma Göre Filtreleme, Sıralama, Sayfalama.
  4. Yeni Ekleme ve Düzenleme Modalı (React Hook Form + Zod).
  5. Silme İşlemi (Yetki korumalı Server Action).

================================================================================
2. MİMARİ VE TEKNİK KURALLAR (KESİNLİKLE ÇİĞNENEMEZ)
================================================================================
1. SIFIR ÇEKİRDEK TEMASI (ZERO-TOUCH CORE):
   - Yalnızca `src/modules/inventory/` ve `src/app/(dashboard)/inventory/page.tsx` dosyalarını üret.
   - `src/registry.ts`, `prisma/schema/base.prisma` veya kök `messages/*.json` dosyalarına ASLA dokunma! (Bunlar `pnpm module:sync` ile otomatik bağlanacaktır).
2. TABLO İSİMLENDİRME KURALI:
   - Tüm tablolarda çakışmayı önlemek için `@@map("inventory_...")` kullan (Örn: `@@map("inventory_items")`).
   - Dış tablolara zorlayıcı foreign key `@relation` yazma, yumuşak referans kullan (`assignedMemberId String?`).
3. KATI İTHALAT (IMPORT) SINIRLARI (`eslint.config.mjs`):
   - Başka bir modülün iç dosyalarını (örn: `@/modules/auth/queries/...`) ASLA import etme! Sadece public girişleri kullan:
     - `@/modules/auth/server` (yetki ve kullanıcı kontrolü için: `requirePermission`, `ForbiddenError`)
     - `@/shared/permissions/define` (`definePermissions`, `can`)
     - `@/shared/components/ui/...` (`PageHeader`, `AccessDenied`, `EmptyState`)
     - `@/shared/components/data-table` (`DataTable`, `DataTablePagination`)
   - Modül içinden `src/app` katmanını ASLA import etme.
4. PUBLIC API SINIRLARI:
   - `index.ts`: İzomorfik public API. KESİNLİKLE `import "server-only"` İÇEREMEZ.
   - `server.ts`: Sunucu public API. İlk satırında `import "server-only";` bulunmalı.
   - `ui.ts`: Dışa aktarılan React görünümleri.
5. UI VE SAYFA EYLEM AYRIMI:
   - `PageHeader actions` alanına YALNIZCA ana oluşturma butonunu (`+ Yeni Demirbaş`) koy.
   - Kategoriler, araçlar veya Excel aktarımı gibi ikincil linkleri sayfa içine yığma, `menu/top.json` içinde tanımla.
6. KRİTİK SSR HYDRATION KURALI (React 19 / Next.js 16):
   - Tablo satırları (`map`) içinde durum/kategori değişimi için HeroUI `<Select>` KULLANMA! Bunun yerine stillendirilmiş native HTML `<select>` ve yanında Lucide `<ChevronDown>` kullan (SSR ID mismatch hatasını önler).

================================================================================
3. ÜRETMEN GEREKEN TÜM DOSYALAR
================================================================================
Lütfen bana her bir dosyanın TAM YOLUNU ve EKSİKSİZ, ÇALIŞMAYA HAZIR KODUNU sırasıyla ver:

1. `src/modules/inventory/module.config.ts`:
   - `key: "inventory"`, `category: "EXTENSION"`, `hasSchema: true`, `topNav: topNav as TopNavItem[]`, `nav: [...]`
2. `src/modules/inventory/menu/top.json`:
   - Topbar sekmeleri: "Genel Bakış" (`/inventory`), "Kategoriler" (`/inventory/kategoriler`), "Excel Dışa Aktar" (`/api/inventory/export`)
3. `src/modules/inventory/permissions.ts`:
   - `definePermissions("inventory", { ADMIN: [...], BOARD: [...], SECRETARY: [...], TREASURER: [...], AUDITOR: [...], VIEWER: [...] })` (6 rol eksiksiz)
4. `src/modules/inventory/schema.prisma`:
   - `InventoryItem` modeli (`@@map("inventory_items")`)
5. `src/modules/inventory/messages/tr.json`:
   - Türkçe arayüz sözlüğü (title, description, fields, status, categories, actions, empty states)
6. `src/modules/inventory/messages/de.json`:
   - Almanca arayüz sözlüğü (tam Verein terminolojisi)
7. `src/modules/inventory/index.ts`:
   - `moduleConfig`, `inventoryPermissions` ve tipleri dışa aktar.
8. `src/modules/inventory/server.ts`:
   - `import "server-only";`, sorgular, eylemler ve izinleri dışa aktar.
9. `src/modules/inventory/ui.ts`:
   - `InventoryListView` bileşenini dışa aktar.
10. `src/modules/inventory/types.ts`:
    - TypeScript arayüzleri (`InventoryItemRow`, `InventoryFilters`, `InventoryStatus`, `InventoryCategory`).
11. `src/modules/inventory/constants.ts`:
    - Kategori ve durum etiketleri, varsayılan sayfalama ve sıralama sabitleri.
12. `src/modules/inventory/schemas/inventory-schema.ts`:
    - Zod şeması (`inventoryCreateSchema`, `inventoryUpdateSchema`).
13. `src/modules/inventory/queries/list-inventory.ts`:
    - Prisma ile filtrelenebilir, sıralanabilir ve sayfalanabilir sorgu fonksiyonu.
14. `src/modules/inventory/actions/inventory-actions.ts`:
    - `"use server"` Server Actions: `createInventoryAction`, `updateInventoryAction`, `deleteInventoryAction` (`requirePermission` denetimiyle).
15. `src/modules/inventory/components/inventory-form-modal.tsx`:
    - Yeni ekleme ve düzenleme formu (HeroUI Modal, Input, Textarea, native select, form doğrulama).
16. `src/modules/inventory/components/inventory-table.tsx`:
    - `DataTable` ile demirbaş listesi, durum rozetleri, silme/düzenleme butonları.
17. `src/modules/inventory/views/inventory-list-view.tsx`:
    - `PageHeader`, istatistik kartları (Toplam adet, Kullanımda, Arızalı), arama/filtre araç çubuğu ve tabloyu içeren ana RSC görünümü.
18. `src/app/(dashboard)/inventory/page.tsx`:
    - Dashboard RSC sayfası (`<InventoryListView searchParams={searchParams} />`).

Lütfen kodları placeholder veya "TODO" bırakmadan, projeye yapıştırıldığında doğrudan çalışacak şekilde eksiksiz üret.
```
