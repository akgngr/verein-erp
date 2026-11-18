# UI Platform — "Sıfır doğrudan HeroUI importu" önerisi ve TODO

> **Durum (2026-11-18): tamamlandı.** W6 kilidi #281 ile kondu.
> - `src/modules/**` içinde 0 doğrudan `@heroui/react` importu var.
> - ESLint kuralı `error` düzeyinde; test sıfırı zorunlu kılıyor.
> - Envanter: [`HEROUI_INVENTORY.md`](./HEROUI_INVENTORY.md) (`pnpm ui:inventory`).
> - Düğme ve bağlantı primitive'leri: `@/shared/components/kit` → `Button`, `ButtonGroup`, `TextLink`, `buttonClassName`.

**Hazırlayan:** Claude (muhasebe / e-fatura / ELSTER iş akışı) · **Alıcı:** UI Platform ajanı · **Tarih:** 2026-11-17
**Dayanak:** `docs/ui/ERP_UI_PLATFORM.md`, `docs/ui/ERP_UI_PLATFORM_TODO.md`, `tests/shared/ui-platform-contract.test.ts`

## 1. Karar (ürün sahibi onaylı)

- **Hedef:** `src/modules/**` altında **sıfır** doğrudan `@heroui/react` importu. İstisna listesi tutulmayacak.
- **Gerekçe:** UI framework'ü değiştirildiğinde ya da kendi UI kütüphanemize geçildiğinde **yalnız ortak katman** yeniden yazılır, modüllere dokunulmaz.
- **Şart:** Ortak bileşenlerin API'si **ERP'nin kendi dilinde** olmalı. Modüller HeroUI'yi import etmese bile, ortak bileşenler HeroUI kavramlarını (`variant="bordered|flat|faded|shadow"`, `color=...`, `classNames` slotları, HeroUI'ye özgü `data-*` seçicileri) aynen taşıyorsa framework bağımlılığı sürer.
- **Yöntem:** Tek dev PR değil. Kısa bir UI dondurma süresinde, **bileşen türüne göre dalgalar**. Her dalga tüm modülleri kapsar. Son dalgada kural kilitlenir.

## 2. Güncel envanter (2026-11-17, main)

- `src/modules` içinde `@heroui/react` import eden dosya: **151**. Test bütçesi şu an 153.
- Modül başına dağılım: accounting 27, meetings 15, documents 14, members 12, courses 9, donations 9, students 6, users / automation / system / calendar 5'er, ai / online-forms / mail / mailings 4'er, diğerleri 1–3.
- Bileşen başına geçiş sayısı (import satırı):

| Bileşen | Adet | Bileşen | Adet |
|---|---|---|---|
| toast | 129 | Description | 31 |
| Button | 117 | Checkbox | 27 |
| Label | 90 | buttonVariants | 23 |
| Spinner | 89 | Switch | 17 |
| TextField | 70 | InputGroup | 15 |
| Input | 55 | Card | 15 |
| Modal | 46 | FieldError | 11 |
| Chip | 35 | Tabs | 10 |
| ListBox | 35 | Tooltip | 8 |
| Link | 33 | Dropdown | 6 |
| TextArea | 33 | CheckboxGroup, DatePicker, DateField | 5'er |
| Select | 33 | RadioGroup, Radio, Drawer | 4'er |

  Diğerleri 1–3 adet: Separator, Table, ProgressBar, ButtonGroup, ComboBox, Header, Slider, Badge.

Bu tablo `scripts/` altına eklenecek bir sayım betiğiyle her dalga sonunda yeniden üretilmeli (bkz. W0).

## 3. İlkeler

1. **Semantik API.** Örnek:
   - `ActionButton({ tone: "primary" | "neutral" | "danger", emphasis: "high" | "medium" | "low", size, pending, icon })`;
   - `notify.success/error/info(message, { timeout })`;
   - `Field`, `TextInput`, `SelectInput`, `Dialog`, `Sheet`, `Badge({ tone })`, `Spinner({ size, label })`.

   HeroUI prop adları ortak API'de görünmez. Eski `color` ve `variant` prop'ları bir dalga boyunca deprecated alias olarak kalabilir, sonra kaldırılır.
2. **Stil kancası.** Modüller yalnız `className` geçirir (layout/spacing). Ortak bileşenin iç parçalarını hedefleyen `classNames` slotları ya da `[data-slot=...]` seçicileri modüllerde yasaktır.
3. **Tip sızıntısı yok.** Ortak API tiplerinde `@heroui/react` tipleri re-export edilmez.
4. **Erişilebilirlik korunur.** Odak halkası, klavye, `aria-*` ve pending durumu her ortak bileşende testlidir.
5. **Server/Client sınırı.** Saf görsel kalıplar (Badge, SurfaceCard çerçevesi vb.) mümkünse server component olarak kalır. `"use client"` yalnız etkileşim gerekiyorsa eklenir.

## 4. TODO (dalgalar)

### W0 — Hazırlık ve kurallar
- [ ] `scripts/ui/heroui-inventory.ts`: modül ve bileşen başına sayım (JSON + Markdown çıktı).
- [ ] Ortak API sözlüğünü yaz (`docs/ui/ERP_UI_PLATFORM.md` → "Component API" bölümü): tone, emphasis, size ve state adları.
- [ ] `ActionButton` için `tone`/`emphasis` ekle. `color`/`variant` deprecated alias olsun ve geliştirme ortamında uyarı versin.
- [ ] ESLint: `src/modules/**` için `@heroui/react` → `no-restricted-imports` önce **warn**, W6'da **error**.
- [ ] Playwright UI smoke iskeleti: her dalga için seçilmiş ekranlarda aç, etkileşime gir, bildirimi gör, Tab ile gezin. Light/dark ve mobil.
- [ ] `releases.json` için `type: "internal"`. Release ekranı ve website katalog üreticisi bunları kullanıcıya göstermesin (ya da katlanmış göstersin).

### W1 — Bildirimler
- [ ] `toast` → `notify` (zaten var). 129 kullanım; codemod ile.
- [ ] `notify` API'si: `success | error | info | warning`, `timeout`, `action?`.

### W2 — Düğmeler ve bağlantılar
- [ ] `Button`, `buttonVariants`, `ButtonGroup`, `Link` → `ActionButton`, `LinkButton`, `ButtonGroup`, `TextLink`.
- [ ] `buttonVariants` kullanımı (23) için `actionClassName({ tone, emphasis })` yardımcı fonksiyonu.

### W3 — Form alanları
- [ ] `Label`, `Description`, `FieldError`, `TextField`, `Input`, `InputGroup`, `TextArea` → mevcut `shared/components/forms/*` kalıplarına (`FormTextField`, `FormTextarea`, `FormInput` …). Gerekirse react-hook-form dışı kullanım için kontrolsüz varyant (`TextInput`) eklenir.
- [ ] `Select`, `ListBox`, `ComboBox` → `SelectField` / `ComboField`.
- [ ] `Checkbox`, `CheckboxGroup`, `Switch`, `RadioGroup`, `Radio`, `Slider` → `CheckboxField`, `SwitchField`, `RadioField`, `RangeField`.
- [ ] `DatePicker`, `DateField` → mevcut `FormDatePicker` / `DateField`.

### W4 — Katmanlar
- [ ] `Modal` → `Dialog` (ConfirmDialog var; genel `Dialog` eklenecek).
- [ ] `Drawer` → `Sheet` (`form-drawer.tsx` ile birleşsin; mobil bottom-sheet davranışı korunsun).
- [ ] `Tooltip`, `Dropdown` → `Hint`, `MenuButton`.

### W5 — Görüntüleme
- [ ] `Spinner` → `Spinner`/`LoadingState`. `Chip`/`Badge` → `StatusChip`/`Badge`. `Card` → `SurfaceCard`.
- [ ] `Tabs`, `Separator`, `ProgressBar`, `Table`, `Header` → ortak karşılıkları. `Table` için `DataTable` dışı basit `SimpleTable`.

### W6 — Kilit
- [ ] Bütçe testini **0**'a çek.
- [ ] ESLint kuralını **error** yap.
- [ ] Scaffold ve `AI_MODULE_PROMPT.md` yalnız ortak katmanı önersin.
- [ ] `ERP_UI_PLATFORM_TODO.md` → "Framework bağımlılığı ortak katmana taşınmış" ✔.
- [ ] Ortak katman için bir "framework değişim provası" yap: tek bir bileşenin (ör. `Badge`) içini HeroUI'siz yaz. Modül diff'i 0 satır olmalı.

**Her dalganın tamamlanma kriteri:**
- Tip kontrolü, lint, unit testler ve hydration testi geçer.
- Dalgaya ait Playwright smoke testleri yeşil.
- Envanter sayımı düşmüş.
- Etkilenen modüllerin sürümleri tek seferde artırılmış, `internal` notla.

## 5. Koordinasyon (iki ajan aynı depoda)

Bugün muhasebe sürüm numarasında iki kez çakışma yaşandı. Paralel çalışma için şu kurallar öneriliyor:

- **Modül sahipliği:** Bir dalga sürerken her modülün `module.config.ts` sürümü ve `releases.json` dosyası **o dalganın sahibinde** olur. Diğer ajan o modüle dokunacaksa önce dalgayı bekler ya da sahiple aynı PR'da birleşir.
- **Dal adları:** `ui/w<N>-<konu>`. Diğer işler `feat|fix|ci/<konu>`.
- **Merge sırası:** Dalga PR'ları sırayla merge edilir. Diğer PR'lar her merge sonrası `origin/main` ile güncellenir; sürüm çakışmasında **yüksek olan sürüm + 1** alınır.
- **Dondurma:** W1–W5 süresince yeni UI ekranı açılmaz. Yalnız hata düzeltmesi yapılır.

### Mevcut sahiplikler (Claude)
- Muhasebe genel bakış paneli (`src/modules/accounting/components/dashboard/*`, `views/dashboard-view.tsx`). Ortak `SurfaceCard`'a taşındı.
- `src/modules/system/views/surface-cards.tsx` (yüzey kartları).
- E-fatura uygunluk iş akışı (`scripts/einvoice-conformance`, `.github/workflows/einvoice-conformance.yml`).
- ELSTER/ERiC hazırlığı (`services/elster-*`, `scripts/elster`, `.github/workflows/elster-eric.yml`).

## 6. Planlama komutu (UI Platform ajanı için)

Aşağıdaki talimatı uygula ve sonucu PR olarak aç:

> **GÖREV — İş bölümü planı:** Bu belgeyi (`docs/ui/HANDOFF_UI_ZERO_IMPORT.md`) ve `docs/ui/ERP_UI_PLATFORM_TODO.md` dosyasını oku. Ardından `docs/ui/WORK_SPLIT.md` dosyasını oluştur. İçeriği:
> 1. **Dalga tablosu:** W0–W6 için sahip ajan (UI Platform ajanı / Claude), tahmini PR sayısı, bağımlılık, başlangıç sırası.
>    - Varsayılan öneri: W0, W1, W2 ve W6 → UI Platform ajanı; W3 (form alanları) → Claude; W4 ve W5 → W3 bitince yeniden dağıtılır.
>    - Gerekçeyle değiştirebilirsin.
> 2. **Modül sahipliği takvimi:** Hangi modülün sürüm ve release dosyası hangi dalgada kimde.
> 3. **Çakışma protokolü:** Dal adları, merge sırası, sürüm çakışmasında kural, dondurma süresi.
> 4. **İletişim:** Her dalga PR'ının açıklamasında "Etkilenen modüller" ve "Sonraki dalga için not" bölümleri. Diğer ajanın işini etkileyen her değişiklik `WORK_SPLIT.md` dosyasında "Değişiklik günlüğü" altına bir satır olarak eklenir.
> 5. **Açık sorular:** Ürün sahibinin karar vermesi gereken noktalar (ör. dondurma süresi, `internal` sürüm notlarının görünürlüğü).
>
> Kod değişikliği yapma. Yalnız planı yaz. PR'ı ürün sahibinin onayına bırak; merge etme.
