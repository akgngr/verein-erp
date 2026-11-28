# UI Platform (W6), Formlar, DataTable, Bulk Actions, Yardımcılar ve i18n

## 1. W6 UI Kilidi — İzinli Import Haritası

`src/modules/**` içinde **`@heroui/react` import veya re-export KESİNLİKLE YASAKTIR** (ESLint error + `tests/shared/ui-platform-contract.test.ts`).

### Temel Bileşenler — `@/shared/components/kit` (Yalnız `"use client"` bileşenlerde; sunucu bileşeninde compound `<X.Y>` YASAK!)
- **Aksiyon:** `Button` (`variant`: `"primary" | "secondary" | "tertiary" | "outline" | "ghost" | "danger" | "danger-soft"`, `size`: `"sm" | "md" | "lg"`), `ButtonGroup`, `TextLink`, `buttonClassName`
- **Form Temel:** `TextField`, `Input`, `TextArea`, `Label`, `Description`, `FieldError`, `InputGroup` (`.Prefix/.Suffix/.Input`), `Select` (`.Item`), `ComboBox` (`.InputGroup/.Trigger/.Popover/.List/.Item`), `Checkbox`, `CheckboxGroup`, `Switch`, `RadioGroup`, `Radio`, `Slider`, `DateInput`, `DateTimeInput` (ISO `"YYYY-MM-DD"` string)
- **Katman (Overlay):** `Dialog` (`.Header/.Heading/.Body/.Footer`), `Sheet` (`.Header/.Heading/.Body/.Footer`), `Tooltip` (`.Content`), `Dropdown` (`.Popover/.Menu/.Item/.Section/.SectionHeader`)
- **Görüntüleme:** `Spinner` (`tone="current" | "accent"`), `StatusChip` (`tone`: `ActionTone` = `"default" | "primary" | "secondary" | "success" | "warning" | "danger"` — `@/shared/components/ui/action-appearance`), `Badge` (`content`, `tone`), `Card` (`.Header/.Content/.Footer` — **sunucu bileşeninde** ayrı export olan `CardHeader`, `CardContent`, `CardFooter` kullan!), `Tabs` (`.List/.Tab/.Panel`, `emphasis`), `Separator`, `ProgressBar` (`tone`), `Table` (`.ScrollContainer/.Content/.Header/.Column/.Body/.Row/.Cell`)
- **Kurallar:** Kit API'sinde `color`, `classNames`, `data-slot` yoktur; ton `tone`, vurgu `emphasis` ile verilir. `className` yalnız yerleşim (layout) içindir.

### Üst Seviye Alanlar — `@/shared/components/fields`
`TextInputField`, `TextAreaField`, `CheckboxField`, `SwitchField`, `RadioGroupField`, `SelectField`.
Ortak `FieldBaseProps`: `label` (veya `ariaLabel`), `description`, `error`, `isRequired`, `isDisabled`, `isReadOnly`, `id`, `name`, `className`, `size: "sm" | "md"`.

### React Hook Form Bileşenleri — `@/shared/components/forms/*`
- `FormInput` (`form-input`), `FormTextarea` (`form-textarea`), `FormSelect` (`form-select`), `FormSwitch` (`form-switch`), `FormDatePicker` (`form-date-picker`), `FormPasswordInput` (`form-password-input`), `FormStateSelect` / `FormCountrySelect` (`form-address-selects`), `FormTextField` (`form-text-field`), `FormErrorSummary` (`form-error-summary`), `SubmitButton` (`submit-button`)
- `applyActionResult`, `describeActionError` (`action-result`)
- `FormDrawer`, `FormDrawerButton`, `FormSurface`, `useFormDrawerHref`, `useFormDrawerClose` (`form-drawer`)

### Ortak UI Desenleri — `@/shared/components/ui/*`
- `PageHeader` (`page-header`) — başlık + açıklama + **yalnızca ana "Yeni" eylemi** (alt sayfalar ve dışa aktarmalar `module.config.ts → menu`'de)
- `AccessDenied` (`access-denied`) — `ForbiddenError` yakalandığında döndürülür
- `EmptyState` (`empty-state`)
- `ConfirmDialog` (`confirm-dialog`) — silme / yıkıcı işlem onayları (form değil!)
- `LinkButton` (`link-button`) — sunucu bileşeninden kullanılabilen buton-link; `/api/` veya `download` için otomatik native `<a>` çizer
- `ActionButton` (`action-button`), `StatusChip` (`status-chip`), `StatCard` (`stat-card`), `SurfaceCard` (`surface-card`), `CopyValue` (`copy-value`), `PdfSplitButton` (`pdf-split-button`), `PageSkeleton` (`page-skeleton`), `FormModal` (`form-modal`)
- `notify` (`notify`) — `notify.success(msg)`, `notify.error(msg)`, `notify.info(msg)`, `notify.warning(msg)` (HeroUI Toast KULLANMA!)

### Ortak Liste & Tablo — `@/shared/components/data-table/*`
- `DataTable` (`data-table`), `type DataTableColumn` (`types`)
- `dataTableSelectionSchema`, `type DataTableSelection` (`@/shared/data-table/selection-contract`)
- `parseBulkSelection` (`@/shared/data-table/server-selection`)
- **YASAK:** Modül içinde `data-table.ts` veya `data-table.tsx` adlı dosya oluşturma (`tests/shared/ui-platform-contract.test.ts`).

---

## 2. Sunucu / İstemci Ayrımı ve Standart Sayfa + Çekmece Kalıbı

### `page.tsx` (Sunucu Bileşeni — İnce Giriş)
```tsx
import { getTranslations } from "next-intl/server";
import { SponsorsListView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("sponsors.meta");
  return { title: t("list") };
}

export default function SponsorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <SponsorsListView searchParams={searchParams} />;
}
```

### `views/item-list-view.tsx` (Sunucu Bileşeni)
- `requirePermission(perm, "view")` çağır; `ForbiddenError` → `return <AccessDenied />;`.
- `await searchParams` → `parseListParams(raw, { sortableFields, defaultSort, defaultDir: "desc", filterKeys })`.
- URL parametreleriyle sağ çekmeceyi koşullu aç:
  - Liste: `{canCreate && raw.yeni !== undefined ? <CreateView /> : null}`
  - Liste düzenle: `{canUpdate && typeof raw.duzenle === "string" && raw.duzenle ? <EditView id={raw.duzenle} /> : null}`
  - Detay sayfası düzenle: `{canUpdate && raw.duzenle !== undefined ? <EditView id={item.id} /> : null}`

### `components/item-form.tsx` (`"use client";` 1. Satırda!)
- Şemada `z.preprocess` veya `.default()` varsa `TS2322` almamak için:
  ```ts
  import { useForm, type Resolver } from "react-hook-form";
  const form = useForm<MyFormValues>({
    resolver: zodResolver(mySchema) as unknown as Resolver<MyFormValues>,
    defaultValues: { ... },
  });
  ```
- Action sonucunu işle:
  ```ts
  const result = await saveAction(values);
  if (!result.ok) {
    setFormError(applyActionResult(result, form.setError));
    return;
  }
  notify.success(t("saved"));
  closeDrawer ? closeDrawer() : router.push("/sponsors");
  ```
- `FormSurface` içine sar (`FormDrawer` içinde çerçevesiz, sayfada kart olur).

### `actions/bulk-*.ts` (Toplu İşlem Sözleşmesi — Zorunlu 5 Parça)
`tests/shared/ui-platform-contract.test.ts` her `actions/bulk-*.ts` dosyasında şu 5 yapıyı zorunlu tutar:
1. `createAction({`
2. `permission: { definition, action }`
3. `parseBulkSelection(input.selection, { allowedFilterKeys: [...] })`
4. `dataTableSelectionSchema` (Zod şemasında `.strict()` ile)
5. `audit({ ... })` — PII/ID listesi yazma; yalnız `selectionType`, `selectedCount`, `updatedCount`, `skippedCount` gibi özet metadata yaz!
- Query-selection'da tüm ID'leri tarayıcıya taşıma; aynı `build<X>Where()` fonksiyonunu sunucuda tekrar kullan (soft-delete ve iş kuralı filtreleri dahil).
- 500+ kayıt, dış API, e-posta veya >5 sn işler → Automation / Export pipeline'ına taşı.
- Yıkıcı toplu işlemler `ConfirmDialog` gerektirir.

---

## 3. Paylaşılan Yardımcılar (Yeniden Yazma, Bunları Kullan!)

| İhtiyaç | Modül / Dosya | Fonksiyonlar |
|---|---|---|
| Veritabanı | `@/shared/db` | `getDb()` |
| Yetki & Action | `@/modules/auth/server` | `createAction`, `requirePermission`, `requireUser`, `getCurrentUser`, `ActionError`, `ForbiddenError` |
| İzin Kontrolü | `@/shared/permissions/define` | `definePermissions`, `can` |
| Liste Parametreleri | `@/shared/list-params` | `parseListParams`, `ListParams`, `ListResult`, `RawSearchParams` |
| Tarih / Kullanıcı / CSS | `@/shared/utils` | `formatDate`, `formatDateTime` (`Europe/Berlin`), `buildUserLabel(user.name, user.email)`, `cn` |
| Para (Integer Cent) | `@/shared/money` | `toCents`, `centsToDecimalString`, `formatMoney` (ASLA float!) |
| Hydration | `@/shared/hooks/use-hydrated` | `useHydrated()` (render'da `typeof window`/`Date.now()`/`Math.random()` YASAK) |
| Dosya Yükleme/Saklama | `@/shared/files` | Doğrulama, MIME/boyut kontrolü, güvenli depolama, HTTP yanıtı |
| Dosya Üretimi (PDF/XLSX/DOCX/MD/CSV) | `@/modules/exports/server` | `createGeneratedFile({ ownerId, title, format, markdown, source })` (`access: exports write`) |
| Özel PDF Fontları | `@/shared/pdf/fonts` | `registerSharedPdfFonts()` (`Font.register` doğrudan çağrılmaz!) |
| Sır Şifreleme | `@/shared/security/secret-box` | Şifreli secret saklama (API anahtarı, IBAN, token) |
| Rate Limiting | `@/shared/security/rate-limit` | Public endpoint / webhook koruması |
| Dış HTTP İsteği | `@/shared/campaigns/channel` | `channelFetch(allowedHosts, url, init, egressMeta)` (çıplak `fetch("https://...")` YASAK!) |
| Prisma JSON Normalizasyonu | Standart JS + `@prisma/client` | `JSON.parse(JSON.stringify(obj))` + `Prisma.JsonNull` / `Prisma.DbNull` (`structuredClone` YASAK!) |

### Hydration Kuralları
- Liste satırlarında (`map`) HeroUI/Kit `Select` yerine stillendirilmiş native `<select>` kullan (SSR ID uyuşmazlığını önler).
- Sunucuda render edilen istemci bileşenlerinde `Date.now()`, `new Date()`, `Math.random()` veya `typeof window` dallanması yapma; tarih karşılaştırmasını sunucu sorgusunda yap, tarayıcıya özel gösterimleri `useHydrated()` arkasına al.
- Motion: yalnız `--motion-fast`, `--motion-normal`, `--motion-slow` ve `.erp-motion-enter` / `.erp-motion-selection` kullan; `transition: all` ve dekoratif sonsuz animasyon kullanma.

---

## 4. Çeviriler (`messages/tr.json` + `messages/de.json`) ve Sabit Metin Denetimi

### Zorunlu Anahtarlar (Eksikse `validate-module.ts` / `navigation.test.ts` HATA verir)
```json
{
  "nav": { "<labelKey>": "..." },
  "module": { "label": "...", "description": "..." },
  "permissions": {
    "<kaynak>": { "label": "...", "description": "..." }
  },
  "meta": { "list": "..." },
  "menu": { "<menuKey>": "..." },
  "access": { "<hedefModül>": "..." },
  "roles": { "<MODUL_ROLU>": { "label": "...", "shortDesc": "..." } },
  "cards": { "<cardKey>": { "title": "...", "description": "..." } },
  "ai": { "<actionKey>": { "kind": "...", "confirm": "...", "done": "..." } }
}
```
*(Sadece modülün kullandığı bölümler zorunludur: örn. `menu` yoksa `menu.*`, `access` yoksa `access.*` gerekmez; ancak `nav.<labelKey>`, `module.label`, `module.description`, `permissions.<kaynak>.*` ve kullanılan `meta.*` daima zorunludur.)*

### `check-i18n-keys.ts` & `check-hardcoded-text.ts` Kuralları
- `tr.json` ve `de.json` **birebir aynı yaprak anahtarlara** sahip olmalıdır.
- Almanca metinler gerçek Almanca olmalıdır.
- **ICU kuralı:** Mesaj içinde `<Jahr>` veya `<etiket>` gibi açılı ayraç kullanma (`INVALID_MESSAGE` hatası). Değişkenler `{year}`, `{title}` biçimindedir.
- Zod mesajları ve `new ActionError(...)` argümanları daima tam çeviri anahtarıdır: `"sponsors.validation.titleRequired"`, `"sponsors.errors.notFound"`. Parametreli hata: `throw new ActionError("sponsors.errors.duplicate", undefined, { number })`.
- Enum etiketlerini kodda nesne olarak tutma (`ACTIVE: "Aktif"` → `check-hardcoded-text.ts` yakalar!); `messages` içine koy (`status.ACTIVE`) ve `t(\`status.${row.status}\`)` ile oku.
- Gerçekten çevrilmemesi gereken satırlara (örn. AI modeline giden İngilizce `description` veya marka adı) satır sonuna `// i18n-ignore` ekle.
- `check-hardcoded-text.ts` şu dosyaları atlar: `messages/`, `*.test.ts(x)`, `pdf/`, `handlers/`, `module.config.ts`, `demo.ts`.
