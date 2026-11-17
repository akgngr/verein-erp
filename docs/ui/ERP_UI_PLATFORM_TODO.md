# ERP UI Platform — TODO

**Tarih:** 2026-11-17  
**Kaynak şartname:** `docs/ui/ERP_UI_PLATFORM.md`

## Faz 0 — Dokümantasyon ve sınırlar

- [x] ERP UI Platform teknik şartnamesini ana dala al.
- [x] Motion sistemi belgesini ekle.
- [x] DataTable sistemi belgesini ekle.
- [x] Modül geliştirme rehberine UI platform kurallarını ekle.
- [x] İngilizce modül rehberini eşleştir.

## Faz 1 — Design System foundations

- [x] `src/shared/ui-platform/` yapısını oluştur.
- [x] semantic design token sözleşmesini tanımla.
- [x] mevcut globals.css tokenlarını yeni sözleşmeyle eşleştir.
- [x] surface/text/border/action/status/radius/elevation tokenlarını standardize et.
- [x] framework adapter sınırını tanımla.
- [x] ortak pattern export yüzeyini oluştur.
- [x] yeni modül UI'larında framework-spesifik importları sınırlayacak CI/ESLint kuralını değerlendir ve güvenli şekilde uygula.

## Faz 2 — Motion layer

- [x] motion duration/easing tokenlarını ekle.
- [x] reduced-motion fallback'ını merkezileştir.
- [x] reusable motion utility/pattern sınıfları ekle.
- [ ] Page/Surface/Card enter motion standardını uygula.
- [ ] hover/focus motion standardını uygula.
- [x] Drawer/Popover geçişlerinin tokenlarla uyumunu doğrula.
- [x] sürekli/dekoratif animation kullanımını engelleyen dokümantasyon kuralı ekle.
- [x] motion regression/smoke testi ekle.

## Faz 3 — DataTable selection

- [x] mevcut `DataTable` props sözleşmesini seçim için genişlet.
- [x] `selectionMode="multiple"` desteğini kontrollü hale getir.
- [x] explicit selection state ekle.
- [x] select-all current page davranışını ekle.
- [x] selected row görsel state'ini semantic tokenlarla tasarla.
- [x] selection değişimini dışarı bildiren typed callback ekle.
- [x] keyboard/ARIA selection davranışını test et.

## Faz 4 — BulkActionBar

- [x] ortak `BulkActionBar` bileşenini ekle.
- [x] selected count göstergesi ekle.
- [x] default/danger bulk action tiplerini ekle.
- [x] clear selection davranışı ekle.
- [x] pending/loading state ekle.
- [x] confirmation gerektiren aksiyon sözleşmesini ekle.
- [x] küçük motion enter/exit davranışını Motion katmanına bağla.
- [x] mobile görünümü doğrula.

## Faz 5 — Query selection

- [x] explicit/query selection union tipini ekle.
- [x] "bu sayfadaki N kayıt seçildi" akışını ekle.
- [x] "filtreye uyan tüm X kayıt" seçim akışını ekle.
- [x] query selection için client'a tüm ID'leri taşımama kuralını uygula.
- [x] excludedIds desteğini ekle.
- [x] server-side selection resolver/helper oluştur.
- [x] query/filter snapshot doğrulaması ekle.
- [x] pagination değişiminde selection semantiğini test et.

## Faz 6 — Bulk action server contract

- [x] ortak bulk action input şemasını tanımla.
- [x] explicit/query selection server validation helper ekle.
- [x] permission doğrulama örneği ekle.
- [x] tenant/organization scope doğrulaması ekle.
- [x] audit metadata standardını belirle.
- [x] destructive action confirmation standardını bağla.
- [x] büyük işlerin Automation'a devri için threshold/rehber ekle.

## Faz 7 — Pilot modüller

- [x] Members listesinde çoklu seçim uygula.
- [x] Members için güvenli bir bulk action pilotu ekle.
- [x] İkinci bir modülde (documents/users uygunluk durumuna göre) selection + bulk action uygula.
- [x] iki pilot modülde keyboard/mobile/hydration testlerini çalıştır.

## Faz 8 — Dokümantasyon ve geliştirici sözleşmesi

- [x] `docs/ui/ERP_MOTION_SYSTEM.md` tamamla.
- [x] `docs/ui/DATA_TABLE_SYSTEM.md` tamamla.
- [x] `MODULE_DEVELOPMENT_GUIDE.md` içine zorunlu UI kuralları ekle.
- [x] `MODULE_DEVELOPMENT_GUIDE_EN.md` eşleştir.
- [x] scaffold template'in yeni DataTable sözleşmesini kullanmasını sağla.
- [x] gerekirse `AI_MODULE_PROMPT.md` içine kısa platform özeti ekle.

## Faz 9 — CI / kalite kapısı

- [x] shared UI varken modül içinde paralel DataTable implementation'ını tespit eden kontrol ekle.
- [x] UI adapter dışındaki framework-spesifik import sınırını test et.
- [x] selection unit testleri.
- [x] bulk permission tests.
- [x] query selection tests.
- [x] reduced-motion smoke.
- [x] hydration tests.
- [x] typecheck.
- [x] lint.
- [x] module validate.
- [x] module version/release checks.

## Tamamlanma kriteri

- [x] Design System, Motion ve DataTable/Bulk Actions merkezi platform olarak çalışıyor.
- [x] Modüller yeni UI sözleşmesini kullanıyor.
- [ ] Framework bağımlılığı ortak katmana taşınmış.
- [x] Explicit + query selection güvenli şekilde destekleniyor.
- [x] Büyük bulk işler worker/export pipeline ile uyumlu.
- [x] Dokümantasyon ve modül geliştirme rehberi güncel.
- [ ] CI yeşil.
