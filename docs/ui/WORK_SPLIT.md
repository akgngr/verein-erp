# UI Platform — Sıfır Doğrudan HeroUI Importu: İş Bölümü Planı

**Tarih:** 2026-11-17  
**Durum:** Ürün sahibi incelemesi bekleniyor; uygulama yetkisi veya merge onayı değildir.  
**Hedef:** `src/modules/**` altında **0** doğrudan `@heroui/react` importu; **istisna yok**.  
**Dayanak:** `docs/ui/ERP_UI_PLATFORM.md`, `docs/ui/ERP_UI_PLATFORM_TODO.md`, `tests/shared/ui-platform-contract.test.ts`, ürün sahibinin 2026-11-17 tarihli *UI Platform — Sıfır doğrudan HeroUI importu* devir metni.  
**Kaynak notu:** `docs/ui/HANDOFF_UI_ZERO_IMPORT.md` dosyası 2026-11-17 tarihinde `main` üzerinde **bulunamadı**; bu plan kullanıcı tarafından sohbet içinde paylaşılan devir metnine dayanır. Belgenin depoya eklenmesi W0 ön koşuludur ve **bu yalnızca plan PR'ında yapılmaz**.

## 1. Karar ve sınırlar

- İş mantığı modüllerde; uygulama framework'ünün tipleri, stil slotları ve etkileşim adaptörleri ortak UI katmanında kalır.
- Doğrudan importun sıfırlanması tek başına yeterli değildir: ortak bileşenlerin public API'si ERP'ye özgü `tone`, `emphasis`, `size`, `pending` gibi terimler kullanır. HeroUI `variant="bordered|flat|faded|shadow"`, `color`, `classNames` slotları, `[data-slot=...]` seçicileri ve HeroUI tiplerinin yeniden dışa aktarılması nihai hedefte yasaktır.
- Büyük tek PR yerine bileşen türüne göre W0–W6 dalgaları uygulanır; **her dalga ilgili bileşen ailesi için tüm modülleri kapsar**. Dalga içindeki PR'lar sıralı, küçük ve gözden geçirilebilir tutulur.
- Yeni UI ekranları W1–W5 dondurma penceresinde açılmaz; acil hata ve güvenlik düzeltmeleri istisnadır. Uygulama başlangıcı ve dondurma süresi ürün sahibi onayına bağlıdır.
- Bu dosya yalnız koordinasyon planıdır. Kaynak, sürüm, release, test veya CI kodu **değiştirilmemiştir**.

## 2. Başlangıç envanteri ve ölçüm

2026-11-17 tarihli devir metni: `src/modules` içinde **151** doğrudan import içeren dosya; testin izin verdiği üst sınır **153**. Bunlar kullanıcı tarafından sağlanan anlık değerlerdir; W0 envanter betiği bunları yeniden ölçerek kanonik başlangıç sayımını üretir. Bileşen kullanım/adet toplamı dosya sayısıyla karıştırılmaz.

Yoğun modüller: `accounting` (27), `meetings` (15), `documents` (14), `members` (12), `courses` ve `donations` (9'ar); `students` (6); `users`, `automation`, `system`, `calendar` (5'er). W0 betiği ayrıca *doğrudan import içeren modül sayısını* ve *bileşen başına kullanım sayısını* raporlar; bir modülün herhangi bir ortak bileşeni kullanması o modülün tam göç ettiği anlamına gelmez.

Her PR açıklamasında önce/sonra metrikleri bulunur: `directImportFiles`, `directImportDeclarations`, `directImportingModules`, `componentUses`, `legacyApiUses`. Sayım scripts/ui/heroui-inventory.ts ile aynı komut üzerinden JSON ve Markdown olarak üretilir; baselines yalnız main'den yenilenir.

## 3. Dalga tablosu

| Dalga | Sahip ajan | Tahmini PR | Bağımlılık / kapsama | Başlangıç sırası / onay kapısı |
| --- | --- | ---: | --- | --- |
| **W0 — Hazırlık** | **UI Platform ajanı** | **2–3** | Devir belgesi depoya eklenir; envanter (JSON/MD), semantik component API sözlüğü, `ActionButton` alias/deprecation, warn düzeyinde restricted imports, Playwright iskeleti, internal release görünürlük tasarımı | **1** — ürün sahibinin bu planı onaylamasından sonra |
| **W1 — Bildirimler** | **UI Platform ajanı** | **1–2** | W0 metrik/CI iskeleti; `toast` → `notify.success/error/info/warning`; timeout/action ve erişilebilir durumlar; tüm modüller | **2** — W0 merge + smoke |
| **W2 — Düğmeler ve bağlantılar** | **UI Platform ajanı** | **2–4** | W1, `ActionButton` semantik API; `Button`, `buttonVariants`, `ButtonGroup`, `Link` → ortak patternler; `actionClassName` | **3** — W1 merge + smoke |
| **W3 — Form alanları** | **Claude** | **4–7** | W2 API stabil; Label/Description/FieldError/TextField/Input/TextArea/InputGroup, Select/ListBox/ComboBox, seçim alanları ve tarih alanları; kontrollü ve kontrolsüz kalıplar | **4** — W2 merge; muhasebe/e-fatura işleriyle çakışma denetimi |
| **W4 — Katmanlar** | **W3 bitince yeniden dağıtılır; varsayılan UI Platform ajanı** | **2–4** | W3 form primitive'leri; Modal/Dialog, Drawer/Sheet, Tooltip/Hint, Dropdown/MenuButton; mobil sheet ve keyboard | **5** — W3 merge; sahip yeniden teyit edilir |
| **W5 — Görüntüleme** | **W3 bitince yeniden dağıtılır; varsayılan UI Platform ajanı** | **2–4** | W4; Spinner/LoadingState, Chip/Badge, Card/SurfaceCard, Tabs/Separator/ProgressBar/Table/Header; SimpleTable ve SSR | **6** — W4 merge; sahip yeniden teyit edilir |
| **W6 — Kilit / prova** | **UI Platform ajanı** | **1–2** | W1–W5 temiz; bütçe 0, ESLint error, scaffold/AI prompt, belge/TODO güncellemesi, Badge framework değişim provası (modül diff'i 0) | **7** — bütün dalgalar merge + CI yeşil |

**Toplam tahmin:** **14–26 PR**; kesin sayı değildir. W4/W5'teki atama W3 bitince iki ajan arasında `WORK_SPLIT.md` güncellenerek netleştirilir. Tahminleri haftalık raporda yeniden değerlendir.

**Dalga tamamlanma kapısı:** Typecheck, lint, ilgili unit ve hydration testleri, Playwright UI smoke (etkileşim, toast, Tab; light/dark, mobil), module validation, module-version/release check yeşil; sayımda ölçülebilir düşüş; etkilenen tüm modüllerin release artışları ve `type: "internal"` notları tek dalga sahipliğinde. W6 için son değer tam **0** ve sınırı 0 olan otomatik test zorunludur.

## 4. Sahiplik takvimi — modül sürümleri ve releases.json

**Kural:** Bir dalga PR'ında değişen **her** modülün `module.config.ts` sürümü ve ilgili `releases.json` kayıtlarının yazma sahipliği o dalganın **tek** sorumlusundadır; iki ajan aynı anda aynı modül sürümünü veya ortak release dosyasını düzenleyemez. Sahiplik *modül başına kalıcı tahsis değil*, aktif dalga başına geçici kilittir.

| Pencere | Aktif sürüm/release yazma sahibi | Kilit ve diğer ajanın işi |
| --- | --- | --- |
| **Plan PR (şimdi)** | **Hiç kimse** — sadece `docs/ui/WORK_SPLIT.md` | Sürüm ve `releases.json` değişmez |
| **W0** | UI Platform ajanı — yalnız gerçekten değişen modüller | Claude accounting/dashboard, system/surface-cards, e-fatura/ELSTER çalışmalarına devam eder; çakışan modül veya release yazımı önceden koordine edilir |
| **W1** | UI Platform ajanı — `toast` göçü yapılan tüm modüller | Claude aktif modüllerde UI göçü veya sürüm artışını aynı anda yapmaz; ayrı iş gerekirse W1 merge sonrasına bırakır |
| **W2** | UI Platform ajanı — düğme/link göçü yapılan tüm modüller | Claude muhasebe/e-fatura/ELSTER kodunu ayrı dalda tutar; sürüm/release çakışması çözülmeden merge yok |
| **W3** | **Claude** — form alanları göçü yapılan tüm modüller | UI Platform ajanı aynı modüllerin sürümünü/release dosyasını değiştirmez; bağımsız ortak adapter/test araştırması yapabilir |
| **W4** | W3 sonrası atanacak tek sahip (**varsayılan UI Platform ajanı**) — layer göçü yapılan tüm modüller | Claude acil düzeltmeler dışında aynı modüllere/sürümlere girmez |
| **W5** | W3 sonrası atanacak tek sahip (**varsayılan UI Platform ajanı**) — display göçü yapılan tüm modüller | Claude accounting dashboard ve system surface-card sahipliğiyle çakışan işleri önceden teslim/koordine eder |
| **W6** | UI Platform ajanı — son kalan modüller (varsa) | Claude UI göçüne dair sürüm/release yazımını W6 kapanana kadar durdurur |

**Bütün 36 modülün kapsamı:** `accounting, ai, audit, auth, automation, banking, calendar-apple, calendar-google, calendar-outlook, calendar, campaign-sms, campaign-telegram, campaign-whatsapp, courses, crm, demo, documents, donations, events, exports, feedback, grants, inventory, mail, mailings, meetings, members, online-forms, organization, progress, security-monitor, sepa, students, system, tasks, users`. Her dalga, kendi bileşen ailesini bu modüllerin **tamamında** tarar; import yoksa sürüm artışı da yapılmaz.

**Claude'un mevcut dosya sahipliği (başka karar verilene kadar):**
- `src/modules/accounting/components/dashboard/**`, `src/modules/accounting/views/dashboard-view.tsx` (SurfaceCard entegrasyonu)
- `src/modules/system/views/surface-cards.tsx`
- `scripts/einvoice-conformance/**`, `.github/workflows/einvoice-conformance.yml`
- `services/elster-*`, `scripts/elster/**`, `.github/workflows/elster-eric.yml`

Bu dosyalara W1–W5 kapsamında UI değişikliği gerekecekse ilgili dalga sahibi Claude ile koordinasyon sağlar; dosya ve release sahipliği yazılı teslim edilmeden iki ajan paralel değişiklik yapmaz.

## 5. Çakışma ve merge protokolü

1. **Dal adları:** `ui/w<N>-<konu>` (ör. `ui/w1-notify`, `ui/w3-form-fields`). Diğer işler `feat/<konu>`, `fix/<konu>`, `ci/<konu>`. Her PR tek dalgaya bağlıdır; plan PR'ı `ui/w0-work-split-plan`.
2. **Merge sırası:** W0 → W1 → W2 → W3 → W4 → W5 → W6; dalga birden fazla PR ise listelenmiş bağımlılık sırasıyla merge edilir. Önceki dalganın CI ve smoke kapısı kapanmadan sonraki dalga merge edilmez.
3. **Güncel dal:** Her merge sonrası diğer açık dallar `origin/main` ile rebase veya merge edilerek güncellenir; tekrar typecheck, lint, test ve version checks çalıştırılır.
4. **Sürüm çakışması:** aynı modül için iki PR farklı sürüm yazdıysa önce birleşmiş main'deki mevcut en yüksek sürümü ve hedef dalın önerisini karşılaştır; semver politikasına uygun şekilde **yüksek sürümden bir sonraki geçerli sürüme** çık; `module.config.ts` ile `releases.json` eşleştir, tek yeni internal not oluştur ve CI doğrula. Körlemesine `+1` string işlemi yapılmaz.
5. **Çift yazma önlemi:** `releases.json` ortak ve yüksek çakışma riskli dosyadır; aktif dalga tek yazar, diğer ajan kendi feature/fix dalında gerekirse sürüm/release değişimini geçici erteler. Kritik fix gerekiyorsa dalga sahibiyle aynı PR'da ortak teslim ya da kısa kilit devri yapılır.
6. **Dondurma penceresi:** W1 başlangıcından W5 bitimine kadar yeni UI ekran/özellik geliştirme durur; acil hata/güvenlik yamaları ayrı PR ile ve yazılı sahiplik devriyle devam eder. Başlangıç/bitiş tarihleri ve süre ürün sahibi tarafından kesinleştirilir. Uzun sürerse dalga başına kısa, yayımlanmış dondurma penceresine geçme kararı da ürün sahibine aittir.
7. **Merge yetkisi:** Bu plan PR'ı **merge edilmez**, ürün sahibi onayı bekler; dalga PR'ları da kalite kapısından sonra proje onay sürecine tabidir.

## 6. PR iletişim sözleşmesi

Her W0–W6 PR'ı açıklamasında zorunlu bölümler:

- **Etkilenen modüller:** dosyalar/modüller, `module.config.ts` ve `releases.json` durumu, sahip ajan.
- **Ölçüm:** envanter önce/sonra (import dosyası, bileşen ve kalan modül).
- **Doğrulama:** typecheck, lint, test, hydration, Playwright light/dark/mobil, module version checks ve sonuçları.
- **Sonraki dalga için not:** yeni ortak API, deprecated alias, bilinen riskler, bekleyen engeller, diğer ajanın dokunmaması gereken dosyalar.
- **Sahiplik / çakışmalar:** açık paralel PR'lar, yeniden baz alma ihtiyacı, teslim edilen dosya kilitleri.
- **Internal not:** release notunun kullanıcı kataloğundan nasıl gizlendiği/katlandığı.

Diğer ajanın işini etkileyen her karar, sahiplik devri, API değişimi veya dondurma değişikliği **aynı PR içinde** aşağıdaki Değişiklik günlüğüne bir satır olarak işlenir. Bu dosyanın eşzamanlı düzenlenmesi de aktif dalga sahibince yönetilir; diğer ajan PR yorumu/öneri ile bildirir.

## 7. Açık sorular — ürün sahibi kararı gerekli

1. **UI dondurma süresi:** W1–W5 boyunca kesintisiz mi, yoksa dalga bazında kısa (önerilen) pencereler mi? Acil bug/security istisna onayı kimin?
2. **Internal release görünürlüğü:** `type: "internal"` notları release ekranında tamamen gizlensin mi, yönetici için katlanabilir mi? Website katalog çıktısı bunları kesinlikle dışlamalı mı?
3. **W4/W5 sahipliği:** W3 sonunda Claude'un muhasebe/ELSTER iş yüküne ve geriye kalan import dağılımına göre kim devralacak?
4. **Her dalganın ürün sahibi onayı:** tüm W0–W6 için ayrı merge onayı mı, yoksa önceden belirlenmiş CI + review kapısı sonrası yetki devri mi?
5. **Dondurma sırasında muhasebe/e-fatura/ELSTER UI değişiklikleri:** mevcut çalışmalar için yalnız servis/CI yürüsün mü, yoksa kritik uyumluluk ekranları yazılı istisna alabilir mi?
6. **Depoda eksik devir belgesi:** `docs/ui/HANDOFF_UI_ZERO_IMPORT.md` içeriğini W0 ilk PR'ına ürün sahibinin paylaştığı metinle birebir ekleme kararı teyit edilsin.

## 8. Değişiklik günlüğü

| Tarih | Sahip | Değişiklik / etkisi | Diğer ajan için not |
| --- | --- | --- | --- |
| 2026-11-17 | UI Platform ajanı | W0–W6 koordinasyon taslağı oluşturuldu; **yalnız plan dosyası** | Devir belgesi `main` dalında yok; W0'da eklenmeli. Bu PR henüz uygulama veya merge izni değildir. |
