# Verein ERP UI Platform — Teknik Şartname

**Durum:** Önerilen platform standardı  
**Tarih:** 2026-11-17  
**Kapsam:** Design System, Motion System, Data Interaction/DataTable, framework bağımsız UI sözleşmesi

## 1. Amaç

Verein ERP arayüzünü belirli bir CSS/component framework'e kilitlemeden ortak, tutarlı ve sürdürülebilir bir UI platformu oluşturmak.

Hedefler:

- Modüller görsel kararları kendi başına vermesin.
- HeroUI v3 mevcut implementasyon katmanı olsun; uygulamanın tasarım sözleşmesi HeroUI'ya bağımlı olmasın.
- Renk, yüzey, tipografi, boşluk, radius, elevation ve motion değerleri semantik tokenlarla yönetilsin.
- Hafif ve işlevsel animasyonlarla arayüze canlılık katılsın.
- Tüm liste ekranlarında ortak DataTable sözleşmesi kullanılsın.
- Çoklu seçim ve toplu işlemler merkezi, güvenli ve yetki kontrollü olsun.
- Büyük toplu işlemler Automation altyapısına devredilebilsin.
- Erişilebilirlik, reduced-motion, keyboard kullanımı ve SSR/hydration kuralları korunmalı.
- Yeni modüller aynı sözleşmeyi otomatik olarak takip etmeli.

## 2. Katmanlar

```text
Business Modules
      ↓
ERP UI Patterns
      ↓
Motion + Data Interaction
      ↓
Design Tokens / Foundations
      ↓
UI Adapter
      ↓
HeroUI v3 + CSS + React Aria
```

### 2.1 UI Adapter

Framework'e özel API yalnızca ortak UI katmanında bulunur.

Hedef bağımlılık yönü:

```text
src/modules/**
    ↓
src/shared/components/**
    ↓
src/shared/ui-platform/**
    ↓
@heroui/react / CSS / react-aria-components
```

Yeni modül kodunda framework'e özel görsel kararlar mümkün olduğunca doğrudan yazılmaz.

## 3. Design System

### 3.1 Token seviyeleri

**Primitive token**
- ham renk skalaları
- spacing basamakları
- radius değerleri
- typography basamakları

**Semantic token**
- surface-page
- surface-card
- surface-muted
- text-primary
- text-secondary
- border-default
- action-primary
- action-danger
- status-success / warning / danger
- focus-ring

Modüller semantic token kullanmalıdır.

### 3.2 Ortak UI patternleri

İlk çekirdek patternler:

- PageHeader
- SectionHeader
- StatCard
- SurfaceCard
- EmptyState
- StatusBadge
- FilterBar
- FormSurface
- ConfirmDialog
- DrawerForm
- DataTable
- BulkActionBar
- InlineFeedback

Her HeroUI bileşeni için birebir wrapper üretilmez. Yalnızca ERP'nin gerçek kullanım patternleri soyutlanır.

## 4. Motion System

Motion dekorasyon değil, durum değişimini anlaşılır kılan geri bildirimdir.

### 4.1 Motion tokenları

Başlangıç değerleri:

- fast: 120ms
- normal: 180ms
- slow: 240ms
- standard easing
- enter easing
- exit easing

### 4.2 Kullanım alanları

- kart/surface girişleri
- hover/focus state
- drawer/popover açılış-kapanış
- tablo satırı seçim state'i
- bulk action bar görünmesi
- success/error feedback
- sayfa içi küçük state geçişleri

### 4.3 Yasaklar

- sürekli dikkat çeken dekoratif animasyon
- büyük translate/scale
- gereksiz bounce
- 300ms üzeri standart UI geçişleri
- `transition: all` ile kontrolsüz motion

### 4.4 Reduced motion

`prefers-reduced-motion: reduce` merkezi olarak desteklenir. Kritik işlev animasyona bağımlı olamaz.

## 5. Data Interaction / DataTable

Mevcut ortak DataTable korunur ve genişletilir.

### 5.1 Temel yetenekler

- server-side search
- filters
- sorting
- pagination
- row actions
- multiple row selection
- bulk actions
- selection feedback
- loading/pending state
- empty state
- responsive toolbar
- keyboard erişilebilirliği

### 5.2 Selection modeli

İki seçim kapsamı desteklenir:

1. **Page selection**
   - yalnızca mevcut sayfadaki satırlar
   - seçilen ID'ler istemcide tutulabilir

2. **Query selection**
   - mevcut filtre/sorguya uyan tüm sonuçlar
   - binlerce ID browser'a taşınmaz
   - sunucu aynı query/filters üzerinden kapsamı çözer

Önerilen tip:

```ts
type DataTableSelection =
  | { type: "explicit"; ids: string[] }
  | {
      type: "query";
      query: {
        q?: string;
        filters: Record<string, string>;
        sort?: string;
        dir?: "asc" | "desc";
      };
      excludedIds?: string[];
    };
```

### 5.3 Bulk action sözleşmesi

```ts
type DataTableBulkAction = {
  key: string;
  label: string;
  icon?: ReactNode;
  variant?: "default" | "danger";
  hidden?: boolean;
  disabled?: boolean;
  requiresConfirmation?: boolean;
  onAction?: (selection: DataTableSelection) => void | Promise<void>;
};
```

UI iş mantığını bilmez; modül yalnızca izin verilen bulk actionları sağlar.

### 5.4 Güvenlik

Her toplu işlem:

- server tarafında yetki kontrolü
- tenant/organization kapsam doğrulaması
- güncel filtre/selection doğrulaması
- kritik işlemlerde confirmation
- audit kaydı
- CSRF/session mevcut action sözleşmeleriyle korunmalı

### 5.5 Büyük işler

Uzun süren bulk işler request içinde yapılmaz.

Örnek:
- 20 kaydı status update → normal server action olabilir
- 5.000 kayıt export → Automation
- 3.000 kişiye mail → Automation
- ağır PDF/XLSX üretimi → Export/Automation pipeline

## 6. DataTable UX standardı

Seçim olduğunda toolbar altında veya yerine merkezi BulkActionBar görünür:

```text
3 kayıt seçildi
[Durum değiştir] [Etiket ekle] [Dışa aktar] [Sil] [×]
```

Seçili satır:

- semantic selected surface
- hafif brand tint
- net checkbox state
- hover ve selected state çakışmamalı

Query selection akışı:

```text
Bu sayfadaki 25 kayıt seçildi.
Bu filtreye uyan 1.842 kaydın tamamını seç
```

## 7. Performans

- Yeni ağır motion paketi varsayılan olarak eklenmez.
- CSS transitions ve gerektiğinde Web Animations API tercih edilir.
- DataTable seçim state'i render maliyetini gereksiz artırmamalı.
- Query selection için tüm ID'ler istemciye gönderilmez.
- Büyük bulk işler worker'a yönlendirilir.
- Yeni ortak bileşenler tree-shake dostu olmalı.

## 8. Erişilebilirlik

- keyboard selection
- visible focus
- aria-selected / uygun table semantics
- bulk action bar için erişilebilir label
- destructive action confirmation
- reduced motion
- renk tek başına durum belirtmemeli

## 9. Framework bağımsızlık kuralları

Yeni UI kodunda:

- semantic token kullan
- ortak pattern varsa yeniden yazma
- modül içinde yeni design token tanımlama
- module-level global CSS oluşturma
- framework-spesifik styling sözleşmesini business logic'e taşıma

Uzun vadeli hedef:
HeroUI v3 değişirse modules büyük ölçüde etkilenmemeli; adapter/pattern katmanı değiştirilmelidir.

## 10. Test ve CI

Eklenmesi gereken kontroller:

- design token smoke/regression test
- module UI restricted-import kontrolü
- DataTable selection unit tests
- page/query selection tests
- bulk action permission tests
- query selection exclusion tests
- reduced motion smoke
- hydration regression
- keyboard/ARIA smoke
- destructive bulk confirmation test

## 11. Dokümantasyon

Aşağıdaki belgeler platformun resmi kaynağıdır:

- `docs/ui/ERP_UI_PLATFORM.md`
- `docs/ui/ERP_MOTION_SYSTEM.md`
- `docs/ui/DATA_TABLE_SYSTEM.md`
- `docs/MODULE_DEVELOPMENT_GUIDE.md`
- `docs/MODULE_DEVELOPMENT_GUIDE_EN.md`

## 12. Kabul kriterleri

Platform tamamlandı sayılır, eğer:

- ortak semantic token sözleşmesi dokümante ve kullanılır durumdaysa
- motion tokenları ve reduced-motion davranışı merkezileştirilmişse
- DataTable çoklu seçimi destekliyorsa
- BulkActionBar ortak bileşense
- explicit ve query selection destekleniyorsa
- en az iki gerçek modül yeni DataTable bulk sözleşmesini kullanıyorsa
- modül geliştirme rehberi güncelse
- framework bağımlılık sınırı testle korunuyorsa
- typecheck/lint/test/hydration yeşilse

## 13. Component API — ERP semantik sözleşmesi (W0)

> Bu bölüm, W1–W6 sıfır doğrudan framework importu geçişinin hedef public API'sini tanımlar. W0'da tüm componentlerin mevcut olduğunu iddia etmez; her dalga uyarlamayı ve geriye dönük davranış testlerini tamamlar.

### 13.1 Adlandırma ve durum

| ERP prop/kavramı | Değerler | Anlam | Not |
| --- | --- | --- | --- |
| `tone` | `primary \| neutral \| danger \| success \| warning` | Semantik eylem veya durum | Framework'ün `color` API'sini dışarıya taşıma |
| `emphasis` | `high \| medium \| low` | Eylemin görsel ağırlığı | `solid/flat/faded/bordered/shadow` değerlerini dışarıya taşıma |
| `size` | `sm \| md \| lg` | Tutarlı boyut skalası | Adapter içindeki gerçek boyut farklı olabilir |
| `disabled` | `boolean` | Etkileşimi kapat | HTML/ARIA ile tutarlı |
| `pending` | `boolean` | Bekleyen async eylem | Görsel durum + çift gönderim koruması |
| `icon` | `ReactNode` | Eylem simgesi | Dekoratif simgeler erişilebilirlikte sessiz |
| `label` | `string` | Görünen veya erişilebilir açıklama | Icon-only butonlarda zorunlu |

Örnek hedef çağrı: `<ActionButton tone="danger" emphasis="low" pending={saving}>Sil</ActionButton>`. Geçiş sırasında mevcut `color`, `variant`, `isPending`, `isDisabled`, `onPress` gibi alias'lar kısa süre korunabilir; her alias için kaldırılacağı dalga ve uygun geliştirici uyarısı belgelendirilir. İki prop birden verilirse semantik prop önceliklidir. Nihai public API framework terminolojisi içermez.

### 13.2 ERP bileşen aileleri

- **Eylem:** `ActionButton`, `LinkButton`, `TextLink`, `ButtonGroup`, `actionClassName`.
- **Geri bildirim:** `notify.success/error/info/warning(message, { timeout, action? })`, `Spinner`, `LoadingState`.
- **Form:** `Field`, `TextInput`, `SelectInput`, `ComboField`, `CheckboxField`, `SwitchField`, `RadioField`, `RangeField`, `DateField` ve React Hook Form adaptörleri.
- **Katman:** `Dialog`, `Sheet`, `Hint`, `MenuButton`.
- **Görselleştirme:** `Badge`, `StatusChip`, `SurfaceCard`, `Tabs`, `Separator`, `ProgressBar`, `SimpleTable` ve mevcut sunucu destekli `DataTable`.

### 13.3 API sızıntısına karşı sınırlar

1. `src/modules/**` içinde **0** doğrudan `@heroui/react` importu: istisna yok (W6'da ESLint error + test bütçesi 0).
2. Ortak API'ler `@heroui/react`'ten tip **re-export etmez**; framework'e ait slot/variant/data-attribute terimlerini public yüzeyde kullanmaz.
3. Modüllerin `className` kullanımı layout/spacing içindir; `classNames` slot prop'ları ve `[data-slot=...]` üzerinden iç DOM hedeflemek yasaktır.
4. Erişilebilir Tab/Space/Enter, focus ring, ARIA ve pending smoke testleri her göç dalgası için kabul kriteridir. Light/dark/mobil ve reduced-motion korunur.
5. Statik Badge/SurfaceCard gibi kalıplar mümkün olduğunca Server Component kalır; `"use client"` yalnız etkileşim gerekiyorsa kullanılır.
6. Geçiş döneminde yeni ortak API doğrudan kullanılır; legacy alias'lar yalnız mevcut çağrıları korumak içindir. Alias'ların kaldırılması W6 onayıyla yapılır.
7. Her dalga tüm modüllerde kendi bileşen ailesinin kullanımını temizler, etkilenen modül sürümleri ve internal release notları aynı PR sahipliği altında güncellenir.

### 13.4 Envanter ve kalite kapısı

Kanonik sayaç: `pnpm exec tsx scripts/ui/heroui-inventory.ts --format json` (W0 envanter PR'ı merge edildikten sonra). Markdown raporu için `--format markdown` kullanılır. Sayım `directImportFiles`, `directImportDeclarations`, `directImportingModules`, `componentUses` ve dosyaları kapsar. TypeScript AST kullanımı yorumlar ve alias'lar nedeniyle yanlış sayımı önler. W0'da ESLint sadece yeni/doğrudan HeroUI importları için **uyarı** verir; mevcut modül sınırı ihlalleri **hata** olarak kalır. W6'da aynı kural error ve bütçe 0 olur.

Operasyonel iş bölümü: [WORK_SPLIT.md](./WORK_SPLIT.md).
