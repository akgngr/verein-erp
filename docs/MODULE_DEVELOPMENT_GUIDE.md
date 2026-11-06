# Verein ERP — Modül Geliştirme Rehberi

> **Tek kaynak.** İngilizcesi: [`MODULE_DEVELOPMENT_GUIDE_EN.md`](MODULE_DEVELOPMENT_GUIDE_EN.md).
> Depoya erişimi olmayan harici bir AI için kopyala-yapıştır istem: [`AI_MODULE_PROMPT.md`](AI_MODULE_PROMPT.md).

Bu rehber, çekirdeğe dokunmadan (**sıfır dokunuş**) yeni bir modül eklemenin kurallarını anlatır.
Kuralların çoğu otomatik denetlenir; bir kural çiğnendiğinde CI kırmızıya döner (bkz. §10).

---

## 1. En hızlı ve en güvenli yol: iskeletle başla

```bash
pnpm module:create sponsors "Sponsorlar" "Sponsoren"
pnpm db:migrate --name add_sponsors      # tabloyu oluşturur (db push KULLANMA)
pnpm dev                                 # → /sponsors
```

`pnpm db:migrate`, `.env` içindeki `DATABASE_URL` veritabanına **bağlanabilmelidir** (Neon gibi uzak bir
sunucuysa ağ erişimi gerekir; yoksa `P1001: Can't reach database server`). Ağı kısıtlı ortamda yerel bir
PostgreSQL kullan (örn. `docker run -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres:16`) ve `DATABASE_URL`'i
ona yönelt. Migration'ı başka bir ortamda üretmen gerekiyorsa bunu açıkça not et; elle SQL yazma.

İskelet **ilk andan çalışan** bir modül üretir: liste (arama, durum filtresi, sıralama, sayfalama),
sağ çekmecede oluşturma/düzenleme formu, silme onayı, denetim kaydı ve Türkçe/Almanca çeviriler.
Tüm kurallardan geçer (tip, lint, sabit metin, çeviri, modül standardı). Yeni alanları ve ekranları
bu iskeletin üzerine ekle; kalıpları kopyalayarak ilerle.

Şablonların kaynağı: `scripts/scaffold-templates.ts` (testi: `tests/scaffold.test.ts`).

---

## 2. Temel ilkeler

1. **Sıfır dokunuş:** `src/app`, `src/registry.ts`, `prisma/schema/*` ve kök `messages/*.json` elle
   düzenlenmez. `pnpm module:sync` hepsini modül klasöründen üretir.
2. **Dikey dilim:** Modülün her şeyi (şema, yetki, çeviri, sayfa, API, bileşen) `src/modules/<anahtar>/`
   altındadır.
3. **Public API sınırı:** Başka modüller yalnızca `@/modules/<m>` (`index.ts`, izomorfik),
   `@/modules/<m>/server` (`server.ts`, `import "server-only"`) ve `@/modules/<m>/ui` (`ui.ts`)
   üzerinden kullanılır. İç klasörler özeldir (ESLint sınır kuralı).
4. **İnce görünüm:** `views/*` yalnızca orkestrasyon yapar: `queries/` ile okur, `components/`'e
   prop geçirir. Hesaplama `helpers/` (saf) veya `services/` (çok adımlı iş, dışa aktarma) içindedir;
   mutasyonlar `actions/` (`"use server"`) içindedir.

---

## 3. Klasör yapısı

```text
src/modules/<anahtar>/
├── module.config.ts     # kimlik, nav (sol panel), menu (modül alt menüsü)
├── permissions.ts       # varsayılan izinler (definePermissions; bkz. §8b)
├── schema.prisma        # modelleri; tablo adları @@map("<anahtar>_...")
├── index.ts | server.ts | ui.ts
├── page.tsx             # modül ana sayfası  → /<anahtar>
├── routes/<yol>/page.tsx   # alt sayfalar   → /<anahtar>/<yol>
├── api/<yol>/route.ts      # API rotaları   → /api/<anahtar>/<yol>
├── messages/tr.json | de.json
├── schemas/  queries/  actions/  services/  helpers/
├── cards/index.tsx      # panel kartları (isteğe bağlı; bkz. §9)
├── components/          # "use client" bileşenler (HeroUI yalnızca burada)
└── views/               # sunucu bileşenleri (HeroUI YOK)
```

`page.tsx`, `routes/` ve `api/` dosyalarının köprülerini `pnpm module:sync` üretir ve hepsini iki
klasörde toplar: sayfalar `src/app/(dashboard)/(modules)/`, API'ler `src/app/api/(modules)/` (parantezli
klasörler rota grubudur, adrese eklenmez). Bu iki klasör her senkronda (`dev`, `build`, `typecheck`
öncesinde de) silinip yeniden kurulur; içlerine elle dosya koyma.
Rota segment ayarları (`export const runtime = "nodejs"` vb.) kaynak dosyada yazılır, köprüye kopyalanır.

---

## 4. Sunucu ve istemci bileşenleri

- `views/*` ve `page.tsx` **sunucu bileşenidir**: `"use client"` yok, hook yok,
  **`@heroui/react` import edilmez** (sayfa 500 ile düşer). HeroUI gerekiyorsa `components/` altında
  `"use client"` bir bileşen yaz. PageHeader butonları için hazır istemci bileşenler:
  `LinkButton`, `FormDrawerButton`.
- `"use client"` / `"use server"` dosyanın **ilk satırıdır**; önüne import gelirse direktif geçersiz olur.
- Liste içinde (`map`) HeroUI `Select` kullanma (SSR kimlik uyuşmazlığı); stillendirilmiş native
  `<select>` kullan.
- Render sırasında `Date.now()` / `new Date()` çağırma; tarih karşılaştırmasını sorguda/helper'da yap.
- `any` yok; `catch (error)` + `error instanceof Error`.

---

## 5. Formlar: sağdan açılan çekmece standardı

Oluşturma/düzenleme formları ayrı sayfa veya modal değil, **sağ çekmecede** açılır. Açık olması URL'de tutulur:

| Nerede | Parametre | Görünüm |
| --- | --- | --- |
| Liste sayfası | `?yeni` (gerekirse `?yeni=<tür>`) | `<X>CreateView` |
| Liste sayfası | `?duzenle=<id>` | `<X>EditView id` |
| Detay sayfası | `?duzenle` | `<X>EditView id` |

Yapı taşları (`@/shared/components/forms/form-drawer`):

- `FormDrawer`: sunucu view'ı formu bunun içine koyar; kapatınca yalnızca `yeni`/`duzenle` silinir, filtreler korunur. Mobilde tam ekrandır.
- `FormDrawerButton param="yeni"`: PageHeader butonu (mevcut sorguyu koruyarak açar).
- `useFormDrawerHref()`: tablo satır eylemleri için (`drawerHref("duzenle", row.id)`).
- `useFormDrawerClose()`: form kaydedince/vazgeçince çekmeceyi kapatır.
- `FormSurface`: sayfada kart, çekmecede çerçevesiz form kabı.

**Form tipleri:** Şemada `z.preprocess` (örn. boş metni `null` yapan `emptyToNull`) ya da `.default()`
varsa Zod'un girdi tipi çıktıdan farklılaşır ve `useForm<FormValues>` ile `zodResolver` arasında
`TS2322` çıkar. Projedeki kalıp (bkz. `meetings/components/meeting-form.tsx`):

```ts
import { useForm, type Resolver } from "react-hook-form";

const form = useForm<TaskFormValues>({
  resolver: zodResolver(taskSchema) as unknown as Resolver<TaskFormValues>,
});
```

İptal/onay soruları (sil, stornier, test e-postası) form değildir; `ConfirmDialog` veya modal kalır.
Örnek uygulama: iskeletin `views/item-*-view.tsx` ve `components/item-form.tsx` dosyaları.

---

## 6. Çeviriler (Türkçe + Almanca zorunlu)

- **Arayüzde sabit metin yoktur.** Tüm metinler `messages/tr.json` ve `messages/de.json` içindedir;
  iki dosya **aynı anahtarlara** sahip olmalıdır.
- Sunucuda `await getTranslations("<anahtar>.<alan>")`, istemcide `useTranslations(...)`.
- Zorunlu anahtarlar:
  - `nav.<labelKey>`: sol panel adı;
  - `module.label` / `module.description`: modül yönetimi listesi;
  - `menu.<key>`: her modül menüsü öğesi;
  - `meta.*`: sayfa başlıkları; `page.tsx` içinde `generateMetadata` kullan, sabit `metadata` değil.
- **Doğrulama ve hata mesajları çeviri anahtarıdır:** `z.string().min(1, "<anahtar>.validation.titleRequired")`,
  `throw new ActionError("<anahtar>.errors.notFound")`. Değer gerekiyorsa üçüncü parametre:
  `new ActionError(key, undefined, { number })`. `createAction` bunları kullanıcının diline çevirir;
  form bileşenleri de alan hatalarını çevirir.
- Enum etiketleri kodda değil mesajlardadır (`types.ACTIVE`, `status.OPEN` …). `constants.ts` yalnızca
  değer listesi tutar.
- ICU kuralı: mesaj içinde `<Jahr>` gibi açılı ayraç kullanma (etiket sanılır); değişken `{ad}` biçimindedir.
- Excel/PDF: Excel başlıkları arayüz dilini izler (Türkçe çıktı şartnamedeki metinlerle aynıdır).
  Resmî PDF'ler `?lang=de|tr` alır ve `pdf/strings.ts` sözlüğü kullanır.

Kök `messages/<dil>.json` **üretilen** dosyadır; `messages/shell/<dil>.json` + modül dosyalarından kurulur.

---

## 7. Diğer kurallar

- **Yetki:** `permissions.ts` 6 sistem rolünün tamamını içerir (ADMIN, BOARD, SECRETARY, TREASURER, AUDITOR, VIEWER);
  modül rollerini (örn. TEACHER) yalnızca ilgili modüller ekler. Bunlar **varsayılandır**; yönetici değiştirebilir (§8b).
  Mutasyonlar `createAction({ permission, schema, handler })` ile yazılır; yetki, şema doğrulama,
  denetim kaydı (`audit`) ve hata çevirisi oradadır.
- **Kullanıcı etiketi:** `createdByLabel` gibi alanlar için `buildUserLabel(user.name, user.email)`
  (`@/shared/utils`); fonksiyon kullanıcı nesnesi değil iki metin alır.
- **Veritabanı:** `const db = getDb()` (`@/shared/db`). Başka modülün tablosuna `@relation` yerine
  yumuşak referans (`memberId String?` + etiket anlık görüntüsü). Üye seçimi için
  `listMemberOptions()` (`@/modules/members/server`) kullan; `member` tablosunu doğrudan sorgulama. Şema değişikliği = migration (`pnpm db:migrate`).
- **Muhasebeye fiş:** Tahsilat yapan modül fişi kendisi yazmaz; `@/modules/accounting/server` içindeki
  `createSourcedBooking` / `reverseSourcedBooking` (kendi transaction'ında `tx` ile) ve
  `getPaymentAccountTargets()` (kasa/banka hesabı) kullanılır. `sourceType` muhasebenin
  `SOURCE_TYPE_VALUES` listesine ve `enums.sourceType` çevirisine eklenir; `sourceId` her tahsilat
  için yeni bir kimliktir (ters kayıttan sonra yeniden ödeme yeni fiş üretir). Örnek: `courses` modülü.
- **Menü:** Alt sayfalar ve dışa aktarma `module.config.ts → menu` içindedir (ana sayfa otomatik eklenir;
  API bağlantıları `isDownload: true`; gerekirse `permission`). PageHeader'da yalnızca ana "Yeni" eylemi olur.
- **Ayarlar:** Sol menüde tek bir "Ayarlar" girişi vardır; ayar ekranları ayrı menü öğesi olarak
  ana menüye eklenmez.
  - Bağımsız bir ayar/yönetim sayfası (örn. "E-posta", "Kullanıcılar") → `nav` öğesine
    `group: "settings"` ver. Sayfa, "Ayarlar" alt menüsünde ve ayar merkezinin (`/ayarlar`)
    "Dernek ve sistem" bölümünde kendiliğinden görünür; açıklama olarak `module.description` kullanılır.
  - Modülün kendi içindeki ayar sayfası (örn. `/muhasebe/ayarlar`) → `menu` içinde `key: "settings"`
    olan bir öğe. Ayar merkezinin "Modül ayarları" bölümünde kendiliğinden listelenir.
  - Kabuğa veya ayar merkezine elle kart/bağlantı ekleme; her şey registry'den kurulur.
- **Liste:** `parseListParams` + `DataTable` (`@/shared/components/data-table/data-table`); arama, filtre,
  sıralama ve sayfalama URL'dedir.

---

## 8. Modüller arası erişim (yönetici onayı)

Bir modül başka bir modülün verisini yalnızca o modülün `@/modules/<m>/server` API'si üzerinden
kullanır ve bunu `module.config.ts` içinde **bildirir**:

```ts
access: [
  { module: "students", operations: ["read"] },
  { module: "accounting", operations: ["read", "write"] },
],
```

- Gerekçe metni `messages/tr.json` ve `de.json` içinde `access.<modül>` anahtarındadır; onay
  penceresinde gösterilir.
- `pnpm module:validate` kodu tarar. Bildirilmemiş bir `server` içe aktarımı ya da başka modülün
  tablosuna doğrudan (`getDb().<model>`) erişim hata verir. İşlem türü fonksiyon adından çıkarılır:
  `delete…`/`remove…` → silme; `create…`, `update…`, `send…`, `…Action` vb. → yazma; diğerleri okuma.
- `auth` (oturum, `createAction`) altyapıdır ve bildirim gerektirmez.
- Yönetici, modülü etkinleştirirken istenen erişimleri bir onay penceresinde görür ve izin verir.
  İzin yoksa modül kullanılamaz: menüde görünmez, sayfaları ve API'leri kapalıdır (üretilen köprüler
  `withModuleGate` / `gateRouteHandler` ile sarılıdır). Modül güncellenip yeni erişim isterse onay
  düşer ve yeniden istenir. İzinler veritabanında (`system_settings`, `module-access:<modül>`) tutulur; resmi modüller onaylı gelir, eklentiler izin bekler.

---

## 8b. Roller ve izinler (veritabanı)

Roller ve izinler artık sabit değildir. **Kullanıcılar → Roller ve İzinler** ekranı kurulu ve
kullanılabilir tüm modüllerden **otomatik** oluşur; modül eklemek için bu ekrana kod yazılmaz.

| Rol türü | Nereden gelir | Silinebilir mi |
|---|---|---|
| Sistem rolleri: ADMIN, BOARD, SECRETARY, TREASURER, AUDITOR, VIEWER | `src/shared/roles.ts` | Hayır (ADMIN kilitli, izinleri değişmez) |
| Modül rolleri (örn. kurslar → TEACHER) | `module.config.ts → roles` | Modülle birlikte gelir/gider |
| Özel roller | Yönetici ekrandan oluşturur (`custom_roles`) | Evet (kullanıcısı yoksa) |

**Modül tarafında yapılacaklar**

1. `permissions.ts`: her kaynak için `definePermissions("kaynak", { ADMIN, BOARD, SECRETARY, TREASURER, AUDITOR, VIEWER, ...modülRolleri })`.
   ADMIN'e verilen işlemler kaynağın **desteklediği** işlemlerdir; ekranda yalnızca bunlar çıkar.
2. Etiketler `messages/{tr,de}.json → permissions.<kaynak>.label` ve `.description` (doğrulayıcı zorunlu tutar).
3. Modül kendi rolünü getiriyorsa `module.config.ts`:
   ```ts
   roles: [{ key: "TEACHER", color: "secondary" }],
   ```
   ve `messages → roles.TEACHER.label`, `roles.TEACHER.shortDesc`. Bu rolün izinlerini, ilgili
   modüllerin `permissions.ts` dosyalarında `TEACHER: [...]` ile varsayılan olarak verin.
4. Yetki denetimi her zaman `can(user.role, tanım, işlem)` / `requirePermission(...)` ile yapılır;
   rol adına göre (`role === "BOARD"`) karar vermeyin — özel roller ve yöneticinin değişiklikleri devre dışı kalır.
   Doğrulayıcı `user.role === "…"` ve `ROLLER.includes(role)` kalıplarını hata sayar.
5. **Kapsam kuralları da izindir.** "Öğretmen yalnızca kendi kurslarını görür", "kimlik no'yu yalnızca
   yönetim görür" gibi kurallar için ayrı bir izin kaynağı tanımlayın ve onu denetleyin:
   ```ts
   export const coursesAllPermissions = definePermissions("coursesAll", { ADMIN: ["view"], …, TEACHER: [] });
   if (can(user.role, coursesAllPermissions, "view")) return null; // tümü; değilse yalnızca kendi kursları
   ```
   Örnekler: `coursesAll` (tüm kurslar), `memberIdentity` (kimlik numaraları), `progressNotesAll`
   (başkalarının notlarını silme). Böylece yönetici bu kuralları da rol bazında açıp kapatabilir.

**Çalışma kuralları**

- Yönetici bir rolün izinlerini değiştirirse fark `role_grants` tablosuna yazılır; "Varsayılana dön" bunu siler.
- Modül pasifleşir/silinirse rolü yeni kullanıcıya atanamaz; rolü taşıyan kullanıcıların **hiçbir izni olmaz**
  (kullanıcı silinmez, modül yeniden açılınca izinler geri gelir).
- Özel rol oluşturulurken başka bir rolün izinleri kopyalanabilir; boş da başlayabilir.
- Yönetici rolünü yalnızca bir yönetici atayabilir/değiştirebilir (yetki yükseltme koruması).

## 8c. Ek npm paketleri (`dependencies`)

Modül çekirdekte olmayan bir npm paketine ihtiyaç duyarsa onu **kendi** `module.config.ts` dosyasında bildirir;
kök `package.json`'a elle eklenmez.

```ts
// src/modules/rozetler/module.config.ts
export const moduleConfig: ModuleConfig = {
  key: "rozetler",
  // …
  dependencies: { qrcode: "^1.5.4" },
};
```

```bash
pnpm module:deps          # bildirilen paketleri kurar, kaldırılan modüllerin paketlerini siler
pnpm module:deps --check  # yalnızca kontrol (CI / değişiklik yapmaz)
```

Ardından `package.json` ve `pnpm-lock.yaml` commit'lenir. Kurallar:

- **Tek kurulum:** paketler kök `package.json`'a eklenir (Next.js modülleri tek uygulama olarak derler);
  hangi modülün eklediği `package.json → moduleDependencies` alanında tutulur. Bu alanı elle düzenlemeyin.
- **Çekirdek paketler** (modüller dışındaki kodun kullandıkları: Next, React, HeroUI, Prisma, zod, exceljs…)
  bildirilmeden kullanılabilir. Modül bunları bildirirse yalnızca sürüm uyumu denetlenir; **çekirdek sürümü
  modülden değiştirilemez** ve modül kaldırılınca silinmez.
- **Doğrulayıcı** (`pnpm module:validate`, CI'da da çalışır): bildirilmemiş dış paket, kurulmamış bildirim,
  geçersiz/uyumsuz sürüm ve eksik sahiplik kaydı hata verir.
- **Güvenlik:** paketler `--ignore-scripts` ile kurulur (kurulum betikleri çalışmaz). İki modül aynı paketin
  uyumsuz sürümlerini isterse komut durur. Dışarıdan gelen modüllerde paket listesi kurulumdan önce incelenmelidir.

## 8d. Modül bağımlılıkları (`requires` / `recommends`)

- `requires: [{ module: "students", version: ">=1.1.0" }]` — ZORUNLU: modül bunlar olmadan çalışamaz. Etkinleştirirken eksikler birlikte açılır
  (izin gerekiyorsa aynı pencerede onaylanır); bunlardan biri kapatılırken bu modül de onayla kapanır; kurulum sihirbazı otomatik ekler;
  `module:install` eksik/eski bağımlılıkta durur.
- `recommends: ["progress"]` — ÖNERİLEN: onsuz çalışır ama eksik kalır; etkinleştirirken işaretli seçenek olarak sunulur.
- `module:check`: bilinmeyen modül, kendine bağımlılık ve döngü (A → B → A) hatadır. Mantık: `@/shared/modules/dependencies`.
- Zorunlu bağımlılığın sunucu API'sini kullanıyorsanız `access` bildirimi ayrıca gereklidir (izin ≠ bağımlılık).

## 9. Panel kartları (`cards/`)

Modül panele (`/`) kart sunabilir. Kullanıcı "Paneli düzenle" ile kartları ekler, kaldırır ve
sıralar; düzen kullanıcı başına kaydedilir. Kullanıcı hiç düzenlemediyse `defaultVisible: true`
kartlar gösterilir. Modül pasifse ya da kullanıcının kartın `permission` yetkisi yoksa kart görünmez.

`src/modules/<anahtar>/cards/index.tsx`:

```tsx
import { Users } from "lucide-react";

import { StatCardBody } from "@/shared/components/dashboard/card-bodies";
import { defineCards } from "@/shared/types/dashboard";

import { sponsorsPermissions } from "../permissions";
import { getSponsorStats } from "../queries/get-sponsor-stats";

export const cards = defineCards([
  {
    key: "overview",                          // kimlik: "sponsors.overview"
    titleKey: "cards.overview.title",         // modül mesajlarında
    descriptionKey: "cards.overview.description",
    icon: Users,
    size: "sm",                               // sm = 1 sütun, md = 2, lg = tam satır
    defaultVisible: true,
    href: "/sponsors",
    permission: { definition: sponsorsPermissions, action: "view" },
    render: async ({ t }) => {
      const stats = await getSponsorStats();
      return <StatCardBody value={stats.active} label={t("cards.overview.active")} />;
    },
  },
]);
```

- Gövde bileşenleri (`@/shared/components/dashboard/card-bodies`): `StatCardBody` (sayı),
  `TableCardBody` (kısa tablo), `GaugeCardBody` (0-100 gösterge), `AlertCardBody` (uyarı).
  Başlık, ikon, bağlantı ve düzenleme düğmelerini panel çizer; kart yalnızca gövdeyi döner.
- `render` sunucuda çalışır: sorgu yapabilir, hook ve HeroUI kullanamaz. `t` modülün çeviri ad
  alanındadır. Gösterecek bir şey yoksa `null` dön (örn. gecikme uyarısı); kart görüntüleme
  modunda gizlenir. Hata fırlatırsa yalnızca o kart hata mesajı gösterir.
- Kart başlık/açıklama metinleri `messages/tr.json` ve `de.json` içinde `cards.<key>.*` altındadır.
- `pnpm module:sync`, `cards/index.tsx` dosyalarını üretilen `src/dashboard-cards.ts` içinde toplar;
  bu dosyayı elle düzenleme. Örnekler: `members`, `meetings`, `documents` modüllerinin `cards/` klasörü.

---

## 9b. Asistan (AI) sözleşmesi (`ai.ts`)

Asistanın bir modülle yapabileceği **her şey** o modülün kendi klasöründeki `ai.ts` dosyasında
tanımlıdır; AI modülünde modüle özel tek satır kod yoktur. (YAML/JSON yerine TypeScript: şemalar ve
fonksiyonlar tip denetimli, doğrulayıcı tarafından okunur, ikisi birbirinden kopamaz.)
`pnpm module:sync` tüm `ai.ts` dosyalarını bulur ve `src/ai-registry.ts`'i üretir (elle düzenlenmez).
Türler ve ortak yardımcılar: `src/shared/ai/define.ts`.

**Mevcut modüller** (örnek olarak bakın):

| Modül | Okuma | Oluşturma / güncelleme / silme (onay kartı) |
|---|---|---|
| `tasks` | açık görevler | görev oluştur, tamamla, sil |
| `documents` | liste, ayrıntı, ek dosya metni, istatistik | evrak kaydı, durum, sil |
| `meetings` | liste, gündem + kararlar, istatistik | toplantı, durum, sil |
| `inventory` | özet, kalem listesi | kalem, durum, sil |
| `courses` | kurs listesi, istatistik | kurs (planlanan), durum, sil |
| `events` | yaklaşan etkinlikler | taslak etkinlik |
| `accounting` | gelir-gider özeti, rapor bağlantısı | — |
| `members`, `donations`, `students`, `progress` | yalnızca istatistik | — |
| `organization` | kamuya açık ana veriler | — |
| `exports` | — | `create_file`: PDF/Excel/Word/Markdown/CSV dosyası (onay kartı yok; bkz. §9c) |

### Şablon

```ts
import "server-only";

import { z } from "zod";

import { aiAction, aiTool, defineModuleAi, NO_INPUT, PROPOSED } from "@/shared/ai/define";
import { can } from "@/shared/permissions/define";

import { examplePermissions } from "./permissions";
import { createThingAction, listThings } from "./server";

const createSchema = z.object({ title: z.string().min(1).max(200) });

export const ai = defineModuleAi({
  module: "example",                         // klasör adıyla AYNI
  tools: [
    aiTool({
      name: "list_things",                   // snake_case, tüm modüllerde benzersiz
      operation: "read",
      allowed: (user) => can(user.role, examplePermissions, "view"),
      description: "Things: id, title, status. No personal data.",   // modele yönelik, İngilizce
      schema: z.object({}),
      inputSchema: NO_INPUT,                  // modele gönderilen JSON şeması
      run: async () => (await listThings()).map(({ id, title, status }) => ({ id, title, status })),
    }),
    aiTool({
      name: "propose_thing",
      operation: "create",
      allowed: (user) => can(user.role, examplePermissions, "create"),
      description: "PROPOSES a new thing. Nothing is created until the user confirms.",
      schema: createSchema,
      inputSchema: { type: "object", properties: { title: { type: "string" } }, required: ["title"], additionalProperties: false },
      run: async (input, { propose }) => {
        propose({ action: "create", title: input.title, details: [], payload: input });
        return PROPOSED;
      },
    }),
  ],
  actions: {
    create: aiAction({ operation: "create", schema: createSchema, execute: (input) => createThingAction(input) }),
  },
});
```

### Kurallar

- **İzin matrisi:** `operation` (read/create/update/delete), yöneticinin **Ayarlar → Yapay zekâ** ekranındaki
  modül satırını belirler. Varsayılan kapalıdır; kapalı işlemin aracı modele hiç sunulmaz. Modülde bir
  işlem için araç yoksa o kutu ekranda çıkmaz.
- **Yazma yok, öneri var:** yazma araçları veriyi değiştirmez; `propose(...)` ile onay kartı üretir ve
  `PROPOSED` döner. Kullanıcı onaylayınca `actions[eylem].execute` çalışır. Onayda: eylem modülde
  tanımlı mı, işlem türü (istemciden değil) eylem tanımından okunur, matris yeniden denetlenir,
  payload `schema` ile yeniden doğrulanır, çağrılan modül eylemi kullanıcının kendi rol yetkisini denetler.
- **`execute`** `{ ok: boolean; error?: string }` döner; `error` bir çeviri anahtarıdır. Modülün
  `createAction` ile yazılmış eylemleri bu biçimi zaten döner.
- **KVKK/DSGVO:** araçlar kişi adı, iletişim, adres, banka veya kimlik verisi **döndürmez**; yalnızca
  sayılar, kurumsal kayıtlar ve başlıklar. Kart `details` satırları da kişisel veri içermez.
  Kullanıcıya giden metinlerdeki maskeler (`title`, `details`, `payload`) AI modülünce otomatik çözülür.
- **Çeviriler:** her eylem için `messages/{tr,de}.json` içinde `ai.<eylem>.kind` (kart başlığı),
  `ai.<eylem>.confirm` (düğme) ve `ai.<eylem>.done` (bildirim) zorunludur.
- **Modüller arası erişim:** `ai.ts` yalnızca **kendi** `./server` ve `./permissions` dosyalarını kullanır.
  Başka modülün verisi gerekiyorsa §8'deki `access` onayı ve o modülün `server` girişi kullanılır.
- **Doğrulayıcı** (`pnpm module:validate`) şunları denetler: `server-only`, `export const ai = defineModuleAi(...)`,
  `module` = klasör adı, snake_case araç adları, `propose` edilen her eylemin `actions` içinde tanımlı olması
  ve eylem çevirileri.

### Yeni modüle asistan desteği ekleme (kontrol listesi)

1. `src/modules/<modül>/ai.ts` dosyasını yukarıdaki şablonla oluşturun.
2. Eylem çevirilerini `messages/tr.json` ve `messages/de.json` içine ekleyin.
3. `pnpm module:sync` → `pnpm module:validate` → `pnpm typecheck`.
4. Ayarlar → Yapay zekâ ekranında modül satırının çıktığını görün ve izinleri açın.

## 9c. Dosya üretme (`exports` modülü — "Dosyalarım")

PDF, Excel, Word, Markdown veya CSV dosyası üretmek için modüller **kendi kodunu yazmaz**; `exports`
modülünün servisini kullanır. Dosya şifreli saklanır, yalnızca sahibi indirir, 30 gün sonra silinir ve
kullanıcının **Dosyalarım** (`/dosyalar`) sayfasında listelenir.

```ts
// module.config.ts → access: [{ module: "exports", operations: ["write"] }]
import { createGeneratedFile } from "@/modules/exports/server";

const file = await createGeneratedFile({ ownerId: user.id, title, format: "xlsx", markdown, source: "members" });
// file.url → indirme bağlantısı (/api/exports/<id>), yalnızca sahibine çalışır
```

- İçerik **markdown** olarak verilir (başlık, paragraf, liste, tablo). Her format aynı içeriği çizer:
  `pdf` (dernek antetli), `xlsx` (her tablo bir sayfa, sayılar gerçek sayı), `docx`, `md`, `csv` (`;` ayırıcı, tablolar).
- **Yeni format eklentisi:** `src/modules/exports/formats/<ad>.ts` içinde `defineFormat({ id, mimeType, extension, render })`,
  ardından `formats/index.ts` listesine ve `FILE_FORMATS`'a ekleyin. Başka bir yer değişmez; asistan da yeni formatı otomatik kullanır.
- Asistan dosyaları `create_file` aracıyla üretir (izin matrisi: **Dosyalarım → oluşturma**). Bağlantı modele verilmez;
  yanıtın altında indirme düğmesi çıkar. Dernek verisini değiştirmediği için onay kartı istemez.

## 9d. Demo veri (`demo.ts`) ve yaşam döngüsü (`lifecycle.ts`)

- **`demo.ts`**: modül, `defineDemo({ moduleKey, order, seed, clear })` ile kendi tablolarına kurgusal örnek kayıt üretir.
  `pnpm module:sync` bunu `src/demo-registry.ts`'e ekler; "Demo veri" modülü (Ayarlar → Demo veri) yalnızca oradan çağırır.
  - Oluşturduğunuz her kaydı **hemen** `ctx.refs.push({ model, id })` ile ekleyin (yarıda kalırsa da temizlenir).
  - Yalnızca kendi tablolarınıza yazın; başka modülün kaydı gerekiyorsa `ctx.created.<modül>` içindeki ref'leri (label/number) kullanın.
  - KVKK: yalnızca `demoPerson()`, `DEMO_IBAN` gibi kurgusal veriler; `@example.com` e-postalar.
  - GoBD gereği silinemeyen kayıtlar (muhasebe kaydı, bağış) üretilebilir ama demo kapatılınca test veritabanında kalır; silme korumasını asla gevşetmeyin.
  - `clear` için `clearRefs(refs, { model: (ids) => ... })`: modeller ters sırada silinir, silinemeyenler döner.
- **`lifecycle.ts`**: `defineLifecycle({ moduleKey, onDisable })`. Yönetici modülü kapattığında sistem `onDisable`'ı çağırır
  (`src/lifecycle-registry.ts`). Demo modülü bununla tüm demo kayıtlarını siler.
- **Silinme hakkı (`onUserDeleted`, zorunlu):** Kullanıcı silinmeden hemen önce sistem her modülün
  `onUserDeleted(userId)` kancasını çağırır (modül kapalı olsa da). Kural:
  - Tablo satırları tek bir kullanıcıya aitse (sohbet, profil, kişisel takvim, kişisel dosya, tercih…)
    `DATA_POLICY` girişine `personalOwnerField: "userId"` yaz ve kancada `x.deleteMany({ where: { userId } })` ile sil.
  - Kurumsal kayıtlar (fiş, toplantı, üye, ortak takvim kaydı…) yasal saklama gereği **kalır**; `createdById`
    yumuşak referanstır, ad etiketi (`…ByLabel`) korunur.
  - `userId`/`ownerId` taşıyan ama silinmeyecek tablo `USER_LINK_RETAINED` listesine gerekçesiyle eklenir.
  - `tests/shared/user-deletion.test.ts` her `userId`/`ownerId` tablosu için bu kararı ve kancayı zorunlu tutar.

## 9e. Modül sürümü ve sürüm notları (`releases.json`)

Modüldeki her değişiklik bir **modül sürümüdür**:

1. `src/modules/<modül>/releases.json` dosyasının EN ÜSTÜNE yeni sürüm ekleyin (`version`, `date`, `title.tr/de`,
   `changes[]` → `type`: feature | improvement | fix | security, `tr`, `de`; isteğe bağlı `appVersion`).
2. `module.config.ts` içindeki `version` aynı sürüm olmalı (`pnpm module:check` denetler).
3. Sürümleme: yeni özellik → minor (1.2.0 → 1.3.0), düzeltme → patch (1.3.0 → 1.3.1), uyumsuz değişiklik → major.
4. CI (`scripts/check-module-versions.ts`): ana dala göre dosyası değişen her modülün sürümü artmış olmalı.
5. Uygulama genel notları `src/modules/system/changelog.json`'da kalır (package.json sürümü). Modül notları
   Ayarlar → Sürüm notları → modül seçimi (`?modul=<anahtar>`) ve Modül Yönetimi'ndeki sürüm bağlantısında görünür.

## 9f. Format eklentileri (`formats.ts`) ve imzalı paketler (`.vmod`)

**Format eklentisi:** `src/modules/<modül>/formats.ts` → `export const formats = defineFormats("<modül>", [defineFormat({ id, mimeType, extension, hint, render })])`
(`@/shared/formats/define`). `render(content, context)` başlık + markdown'dan `Buffer` üretir. `pnpm module:sync` `src/format-registry.ts`'i
üretir; format "Dosyalarım"da ve asistanın `create_file` aracında kullanılır. Modül kapalıysa format kullanılamaz; yerleşik kimlikler (pdf, xlsx, docx, md, csv) ezilemez.

**Paketleme ve kurulum:**

```bash
pnpm module:keygen <yayıncı>                       # <yayıncı>.private.pem (gizli) + trusted-publishers girdisi
pnpm module:pack <modül> --key <yayıncı>.private.pem --publisher <yayıncı> [--migration <klasör>]...
pnpm module:install <dosya.vmod>                   # doğrula → yerleştir → module:sync + module:deps
pnpm db:deploy && pnpm build                       # ardından yayımla
```

- Güvenilen yayıncılar `src/config/trusted-publishers.json`'da; değişiklik yalnızca kod incelemesiyle. `official: true` olmayan yayıncı yalnızca `EXTENSION` yayımlar.
- Paket: dosya yolları güvenli olmalı (göreli, `..`/gizli dosya/`node_modules` yok, izinli uzantılar), her dosyanın SHA-256'sı manifestte, manifest Ed25519 ile imzalı.
- Yalnızca daha yüksek sürüm kurulur; önceki sürüm `.module-backups/` altına alınır; doğrulama başarısızsa kurulum geri alınır.
- Ayarlar → Modül paketleri: yükle ve doğrula (içerik çalıştırılmaz), kurulum komutunu kopyala.

## 9g. Toplu e-posta alıcı kaynakları (`recipients.ts`)

Modül, "Toplu e-posta" modülüne alıcı listesi sunar:
`export const recipients = defineRecipients("<modül>", [{ key, permission, placeholders, filters, sampleVars, resolve }])` (`@/shared/mailings/define`).
`resolve(filter)` → `{ id, email, name, optOut, vars }[]`. Kaynağı yalnızca `permission` yetkisi olan görür; modül kapalıysa listelenmez.
Etiketler: `<modül>.recipients.<kaynak>.label`, `...filters.<filtre>.label`, `...filters.<filtre>.options.<değer>`. İtiraz (`optOut`) ve e-postasızlar atlanır.
Programatik gönderim: `import { sendBulkMail } from "@/modules/mailings/server"` (+ `access: [{ module: "mailings", operations: ["write"] }]`).

## 9h. Arka plan otomasyonu ve görev sözleşmesi (`automation.ts`)

Arka plan işi gereken modüller, işi kendi modülünde tanımlar; kuyruk/worker altyapısını yeniden
uygulamaz. Verein ERP'de görev tanımı, kalıcı yürütme kaydı, transactional outbox ve pg-boss worker
birbirinden ayrıdır.

### İki farklı `automation.ts` girişini karıştırmayın

- `src/modules/<iş-modülü>/automation.ts`: Modülün otomasyon sistemine sunduğu **görev tanımıdır**.
  `defineTask(...)` ile görev anahtarı, sürüm, girdi şeması, timeout, retry politikası, idempotency
  anahtarı ve handler tanımlanır. Örnek: `src/modules/mailings/automation.ts`.
- `src/modules/automation/automation.ts`: Otomasyon altyapısının diğer sunucu kodlarına sunduğu
  **dar worker API'sidir**. Yürütme kaydı oluşturma gibi altyapı fonksiyonlarını dışa aktarır; görev
  registry'sini veya Next.js arayüzünü içe aktarmaz.
- `server.ts`: Web uygulaması, sayfalar ve Server Actions için modülün genel sunucu API'sidir.
  Worker'ın ihtiyacı olan her şeyi buraya eklemek yerine, yalnızca gerekli fonksiyonları içeren
  ayrı bir `automation.ts` giriş noktası oluşturun.

### Görev tanımı

`src/modules/<iş-modülü>/automation.ts` için temel kalıp:

```ts
import "server-only";

import { z } from "zod";
import { defineTask } from "@/shared/automation/define";

export const processExampleTask = defineTask({
  key: "example.process_item", // <modül>.<task>, kararlı ve benzersiz
  version: 1,                  // girdi/çıktı sözleşmesi uyumsuz değişirse artır
  description: "example.process_item",
  inputSchema: z.object({
    itemId: z.string().min(1).max(128),
  }).strict(),
  timeoutSeconds: 300,
  retry: {
    maxAttempts: 3,            // ilk deneme DAHİL toplam deneme sayısı
    initialDelaySeconds: 30,
    maxDelaySeconds: 900,
    backoffMultiplier: 2,
  },
  idempotencyKey: (input) => `example:item:${input.itemId}`,
  handler: async (input, context) => {
    const { processItem } = await import("./services/process-item");
    return processItem(input.itemId, context);
  },
});
```

- Görev anahtarı modül ad alanlı olmalıdır: `<modül>.<task_name>`. Görev anahtarını yeniden
  adlandırmak yerine sözleşme uyumsuz değiştiğinde `version` artırılır.
- `inputSchema` kuyruktan gelen veriyi handler'a ulaşmadan doğrular. Gereksiz alanları reddetmek
  için `.strict()` kullanın.
- Kuyruk girdisi ve yürütme bağlamı yalnızca iş için gereken en az bilgiyi taşımalıdır: kayıt
  kimlikleri, tenant/organizasyon kimliği ve korelasyon bilgisi. E-posta adresleri, alıcı listeleri,
  kimlik numaraları, banka verileri, oturum token'ları veya başka PII verilerini payload'a koymayın.
  Hassas/çoklanan iş verisini kaynak modülde saklayıp handler içinde tekrar çözümleyin.
- Handler yalnızca güvenilir uygulama kodudur. Kullanıcı girdisinden import yolu, fonksiyon adı,
  kod veya çalıştırılabilir handler üretmeyin. Görevler statik registry'ye eklenir:
  `src/modules/automation/tasks/registry.ts`.
- Handler iş mantığını modülün `services/` katmanında tutun. `automation.ts` yalnızca sözleşmeyi
  ve gerekli bağlantıyı tanımlasın.
- `idempotencyKey` aynı mantıksal yürütmenin yinelenmesini önlemeye yarar; tek başına e-posta,
  ödeme veya başka dış yan etkilerin alıcı/işlem bazında tam bir kez gerçekleşmesini garanti etmez.
  Kısmi başarısızlık ve retry ihtimali varsa yan etki düzeyinde ayrıca tekilleştirme yapın.

### Görev başlatma ve kuyruk akışı

Görev oluşturma ve kuyruk gönderim niyeti aynı veritabanı transaction'ında kaydedilir. Worker ayrı
bir süreçtir; transactional outbox kayıtlarını pg-boss kuyruğuna aktarır. Yeni modül kendi kuyruk
tablosunu, cron mekanizmasını veya pg-boss bağlantısını oluşturmaz.

`createTaskExecutionRecord`, otomasyon modülünün dar API'sinden alınır:

```ts
import { createTaskExecutionRecord } from "@/modules/automation/automation";

// Önce çağıran kullanıcının yetkisini, modülün etkinliğini ve iş kurallarını doğrulayın.
const execution = await createTaskExecutionRecord({
  taskKey: "example.process_item",
  taskVersion: 1,
  organizationId,
  requestedById: user.id,
  sourceModule: "example",
  correlationId,
  idempotencyKey: `example:item:${itemId}`,
  input: { itemId },
  maxAttempts: 3,
});
```

Bu fonksiyon bir **iç persistence primitive**'idir; kullanıcı yetkisini veya kaynak modülün
erişilebilirliğini kendi başına doğrulamaz. Çağıran servis bu kontrolleri çağrıdan önce yapmalıdır.
Aynı idempotency anahtarının veritabanı benzersizlik kuralıyla çakışabileceğini iş akışında ele alın.

### Worker için dar API ve bağımlılık sınırı

Worker, Next.js request context'i dışında çalışır. Bu nedenle worker'ın kullandığı modül API'leri:

- `import "server-only"` ile işaretlenmeli;
- Next.js UI, React, `next-intl/server`, `next/headers`, `next/cache`, Server Action veya
  istek bağlamına bağlı kodu transitif olarak içe aktarmamalı;
- geniş `server.ts` barrel'ı yerine yalnızca worker'ın ihtiyaç duyduğu fonksiyonları dışa aktarmalı;
- salt-okunur sorgu ve iş servisi sınırlarını açıkça ayırmalıdır.

Örnek worker girişleri: `@/modules/mail/automation`,
`@/modules/users/automation`, `@/modules/system/automation` ve
`@/modules/automation/automation`. Worker kullanan bir modülde yeni API gerekiyorsa bu dar
girişe ekleyin; UI/action/cache bağımlılıklarını buraya taşımayın. Modüller arası erişim için
ilgili `module.config.ts → access` bildirimi ve gerekçe çevirileri de korunur.

### Hata yönetimi, retry ve yürütme durumu

- Claim işleminden sonra yapılan **bütün** işler aynı `try/catch` hata sınırında olmalıdır.
  Başlangıç logu, görev çözümleme, şema doğrulama, timeout kurulumu ve handler çağrısı bu kapsama
  dahildir. Claim sonrası hata yakalama dışında kalan bir işlem yürütmeyi `RUNNING` durumunda
  bırakabilir.
- Worker, Next.js isteğine bağlı çeviri/context fonksiyonlarını çağırmamalıdır. Kullanıcıya
  gösterilecek metinleri UI katmanında çevirin; worker loglarında kararlı task key ve hata kodu
  kullanın.
- Retry politikası toplam deneme sayısını, ilk gecikmeyi, üst gecikme sınırını ve backoff
  çarpanını açıkça tanımlar. Geçici hata retry edilir; deneme hakkı bittiğinde yürütme ve adım
  terminal `FAILED` durumuna alınır. Başarıda `SUCCEEDED` kaydedilir.
- Worker claim işlemi atomik olmalı; aynı yürütmenin eşzamanlı iki worker tarafından alınması
  engellenmelidir. Uzun işlerde stale/lease süresini görevin timeout ve gerçek çalışma süresine
  göre belirleyin.
- Bir worker düzeltmesi gelecekteki takılmaları önlese bile geçmişte `RUNNING` kalmış kayıtları
  otomatik olarak güvenle yeniden çalıştırdığı anlamına gelmez. Özellikle e-posta/ödeme gibi
  kısmen gerçekleşmiş dış yan etkilerde önce işlem geçmişini ve tekilleştirme durumunu inceleyin.

### Kalıcı loglar ve izleme

- Worker olayları `AutomationLog` üzerinden kalıcı kaydedilir. En azından başlangıç, retry
  edilecek hata, son hata, başarı ve terminal başarısızlık olayları izlenebilir olmalıdır.
- Log yazımı **best-effort** olmalıdır: log veritabanına yazılamazsa asıl işin sonucu değişmemeli,
  log hatası görevi başarılı/başarısız olmaktan çıkarmamalıdır.
- Log alanları kısa ve sınırlı tutulmalı; PII, alıcı adresleri, erişim token'ları veya tam hassas
  payload kopyaları yazılmamalıdır. Hata mesajları ve `details` için boyut/sanitizasyon sınırı koyun.
- İzleme ekranı yalnızca görüntüleme yetkisiyle korunmalıdır. Mevcut otomasyon ekranı son 100
  yürütmeyi, her yürütmenin son 8 log kaydını ve mailings entegrasyonunda kampanya özeti/başarısız
  gönderim hata detaylarını gösterir; alıcı e-posta adreslerini göstermez.
- Bu ekranın sayfa render'ında veri okuduğunu unutmayın: mevcut uygulamada gerçek zamanlı polling
  garantisi yoktur. Gerekirse yenileme davranışını ayrıca tasarlayın.

### Modül geliştiricisi için otomasyon TODO listesi

Yeni modülde arka plan görevi gerekiyorsa:

- [ ] İşin gerçekten arka planda çalışması gerekip gerekmediğini belirle; normal request içinde
      bitebilen işi gereksiz yere kuyruğa taşıma.
- [ ] İş girdisini ve tenant/organizasyon kapsamını tanımla; yalnızca gerekli ID ve metadata'yı taşı.
- [ ] `automation.ts` içinde `defineTask` sözleşmesini, strict Zod şemasını ve görev sürümünü tanımla.
- [ ] Timeout, toplam retry sayısı ve backoff değerlerini işin gerçek süresine göre belirle.
- [ ] Idempotency anahtarını kararlı ve PII içermeyen biçimde tanımla.
- [ ] E-posta/ödeme/dış API gibi yan etkiler için işlem/alıcı düzeyinde tekrar önleme ve kısmi başarı
      kurtarma stratejisi ekle.
- [ ] İş mantığını `services/` içine al; handler'ı ince tut ve yalnızca statik task registry'ye kaydet.
- [ ] Gerekli worker fonksiyonlarını ayrı `automation.ts` public girişinden sun; geniş `server.ts`
      barrel'ına veya Next.js request-context koduna bağlama.
- [ ] Her modüller arası erişimi `module.config.ts → access` içinde bildir ve TR/DE gerekçelerini ekle.
- [ ] Yetki, modül etkinliği, tenant izolasyonu ve kaynak kaydın hâlâ kullanılabilir olduğunu
      yürütme anında yeniden doğrula.
- [ ] Loglarda PII olmadığını; log yazma hatasının iş sonucunu etkilemediğini test et.
- [ ] Başarı, geçici hata/retry, son hata, timeout, geçersiz payload, bilinmeyen task/version,
      eşzamanlı claim ve kısmi yan etki senaryolarını test et.
- [ ] `module.config.ts` sürümünü artır ve `releases.json` dosyasının en üstüne TR/DE sürüm notu ekle.
- [ ] `pnpm module:sync`, `pnpm module:validate`, i18n/hardcoded-text kontrolleri, typecheck,
      lint ve testleri çalıştır.

## 10. Doğrulama (CI aynı adımları çalıştırır)

```bash
pnpm module:sync                                  # köprüler, şema, çeviri, kayıt
pnpm module:validate                              # modül standardı + çeviri bütünlüğü + migration
pnpm exec tsx scripts/check-i18n-keys.ts          # kullanılan her anahtar tr/de'de var; ICU geçerli
pnpm exec tsx scripts/check-hardcoded-text.ts     # arayüzde sabit metin yok
pnpm exec tsx scripts/check-module-versions.ts    # değişen modülün sürümü arttı mı (ana dala göre)
pnpm typecheck && pnpm lint && pnpm test
```

`pnpm typecheck` önce eski Next rota tiplerini (`.next/types`, `.next/dev/types`) siler; `next dev` açıkken
yeni rota eklenince oluşan `.next/dev/types/routes.d.ts … TS1128` hatası böylece çıkmaz. `tsc`'yi doğrudan
çalıştırıyorsan önce `rm -rf .next/types .next/dev/types`.

Testlerin yakaladıkları: elle yazılmış `src/app` dosyası (`zero-touch`), ilk satırda olmayan direktif
(`directives`), "use client" olmadan HeroUI (`heroui-client-only`), sayfası olmayan menü bağlantısı
(`navigation`), iskelet şablonlarının kurallara uyumu (`scaffold`).


## Hydration hataları (SSR ↔ istemci uyuşmazlığı)

- HeroUI `Select` sunucu ve istemcide farklı react-aria `id` üretebilir. Sunucuda render edilen istemci bileşenlerinde `Select` yerine `@/shared/components/ui/client-select` içindeki `ClientSelect`'i kullanın (aynı props ve children).
- Yalnızca istemcide anlamlı içerik için `@/shared/hooks/use-hydrated` (`useHydrated()`) kullanın; `typeof window` dallanması, `Date.now()`/`Math.random()` ile render, tarayıcı yerel ayarına bağlı tarih biçimi hydration hatasına yol açar.
- **Test:** `pnpm test:hydration` tüm statik panel sayfalarını gerçek tarayıcıda açar ve hydration ya da sayfa hatasında başarısız olur (CI'da da çalışır). Yerelde: uygulamayı başlatın, sonra `E2E_EMAIL=… E2E_PASSWORD=… BASE_URL=http://localhost:3000 pnpm test:hydration`. Tek sayfa için `HYDRATION_ROUTES=/automation`. İlk kullanımda tarayıcı: `pnpm exec playwright install chromium`.

## Otomasyon olayları (iş akışı tetikleyicileri)

Bir modül kendi olaylarını yayımlayabilir; bu olaylar İş akışları düzenleyicisinde **tetikleyici** olarak, alanları da **koşul** ve **metin değişkeni** olarak otomatik görünür. Merkezi bir dosyayı düzenlemek gerekmez (`pnpm module:sync` olayları `src/automation-registry.ts`'e ekler).

1. **Tanım** — `src/modules/<modül>/automation.ts`:

   ```ts
   export const feedbackCreatedEvent = defineEvent({
     key: "feedback.created",                 // önek = modül anahtarı
     description: "feedback.created",
     payloadSchema: z.object({                // yalnızca kimlik ve sınıflandırma
       feedbackId: z.string(),
       type: z.enum(["BUG", "SUGGESTION"]),   // enum → koşulda seçenek listesi
       priority: z.enum(["LOW", "NORMAL", "HIGH"]),
     }).strict(),
     variables: {                             // isteğe bağlı: {{feedback.title}} vb.
       namespace: "feedback",
       fields: ["number", "title"],
       load: async (payload) => { /* kaydı oku, düz değerler döndür */ },
     },
   });
   ```

2. **Yayımlama** — kaydı oluşturan işlemde, mümkünse aynı transaction ile:

   ```ts
   await emitAutomationEvent(feedbackCreatedEvent, { feedbackId: item.id, type: item.type, priority: item.priority }, tx);
   ```

   Otomasyon kapalıysa çağrı hiçbir şey yapmaz; modül Automation'a bağımlı olmaz.

3. **Çeviriler** — `messages/{tr,de}.json` → `automation.events.<ad>`:
   - `label` (ör. "Geri bildirim gönderildiğinde"),
   - `fields.<alan>`, enum alanlar için `options.<alan>.<DEĞER>`,
   - `variables.<alan>`, isteğe bağlı `help.<alan>` (elle değer girerken gösterilen ipucu).

**Kurallar (testle denetlenir: `tests/automation/module-events.test.ts`):**
- Yükte (payload) kişisel veri yoktur: ad, e-posta, telefon, adres, not vb. alanlar `variables.load` ile **gönderim anında** okunur, kuyruğa/kayda yazılmaz.
- Her olayın tr/de adı, alan ve seçenek etiketleri vardır.
- Olay modülün kodunda `emitAutomationEvent(<olay>, …)` ile gerçekten yayımlanır.

**Düzenleyicide:** Koşul adımı tetikleyicinin olayına göre yalnızca o olayın alanlarını listeler; enum alanlarda değer seçenekli gelir, "Diğer (elle yaz)" ile manuel girilebilir (ipucu `help.<alan>` veya alan türünden gelir).
