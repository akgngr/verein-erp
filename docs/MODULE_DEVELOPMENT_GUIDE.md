# Verein ERP — Modül Geliştirme Rehberi

> **Tek kaynak.** İngilizcesi: [`MODULE_DEVELOPMENT_GUIDE_EN.md`](MODULE_DEVELOPMENT_GUIDE_EN.md).
> Depoya erişimi olmayan harici bir AI için kopyala-yapıştır istem: [`AI_MODULE_PROMPT.md`](AI_MODULE_PROMPT.md).

Bu rehber, çekirdeğe dokunmadan (**sıfır dokunuş**) yeni bir modül eklemenin kurallarını anlatır.
Kuralların çoğu otomatik denetlenir; bir kural çiğnendiğinde CI kırmızıya döner (bkz. §9).

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
├── permissions.ts       # 7 rolün yetki matrisi (definePermissions)
├── schema.prisma        # modelleri; tablo adları @@map("<anahtar>_...")
├── index.ts | server.ts | ui.ts
├── page.tsx             # modül ana sayfası  → /<anahtar>
├── routes/<yol>/page.tsx   # alt sayfalar   → /<anahtar>/<yol>
├── api/<yol>/route.ts      # API rotaları   → /api/<anahtar>/<yol>
├── messages/tr.json | de.json
├── schemas/  queries/  actions/  services/  helpers/
├── cards/index.tsx      # panel kartları (isteğe bağlı; bkz. §8)
├── components/          # "use client" bileşenler (HeroUI yalnızca burada)
└── views/               # sunucu bileşenleri (HeroUI YOK)
```

`page.tsx`, `routes/` ve `api/` dosyalarının `src/app` köprülerini `pnpm module:sync` üretir.
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

- **Yetki:** `permissions.ts` 7 rolün tamamını içerir (ADMIN, BOARD, SECRETARY, TREASURER, AUDITOR, VIEWER, TEACHER).
  TEACHER (öğretmen) yalnızca kurs ve öğrenci takibi modüllerini görür; diğer modüllerde `TEACHER: []`.
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

## 8. Panel kartları (`cards/`)

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

## 9. Doğrulama (CI aynı adımları çalıştırır)

```bash
pnpm module:sync                                  # köprüler, şema, çeviri, kayıt
pnpm module:validate                              # modül standardı + çeviri bütünlüğü + migration
pnpm exec tsx scripts/check-i18n-keys.ts          # kullanılan her anahtar tr/de'de var; ICU geçerli
pnpm exec tsx scripts/check-hardcoded-text.ts     # arayüzde sabit metin yok
pnpm typecheck && pnpm lint && pnpm test
```

`pnpm typecheck` önce eski Next rota tiplerini (`.next/types`, `.next/dev/types`) siler; `next dev` açıkken
yeni rota eklenince oluşan `.next/dev/types/routes.d.ts … TS1128` hatası böylece çıkmaz. `tsc`'yi doğrudan
çalıştırıyorsan önce `rm -rf .next/types .next/dev/types`.

Testlerin yakaladıkları: elle yazılmış `src/app` dosyası (`zero-touch`), ilk satırda olmayan direktif
(`directives`), "use client" olmadan HeroUI (`heroui-client-only`), sayfası olmayan menü bağlantısı
(`navigation`), iskelet şablonlarının kurallara uyumu (`scaffold`).
