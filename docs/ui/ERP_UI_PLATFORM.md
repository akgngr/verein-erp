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
