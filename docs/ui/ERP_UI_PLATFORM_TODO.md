# ERP UI Platform — TODO

**Tarih:** 2026-11-17  
**Kaynak şartname:** `docs/ui/ERP_UI_PLATFORM.md`

## Faz 0 — Dokümantasyon ve sınırlar

- [ ] ERP UI Platform teknik şartnamesini ana dala al.
- [ ] Motion sistemi belgesini ekle.
- [ ] DataTable sistemi belgesini ekle.
- [ ] Modül geliştirme rehberine UI platform kurallarını ekle.
- [ ] İngilizce modül rehberini eşleştir.

## Faz 1 — Design System foundations

- [ ] `src/shared/ui-platform/` yapısını oluştur.
- [ ] semantic design token sözleşmesini tanımla.
- [ ] mevcut globals.css tokenlarını yeni sözleşmeyle eşleştir.
- [ ] surface/text/border/action/status/radius/elevation tokenlarını standardize et.
- [ ] framework adapter sınırını tanımla.
- [ ] ortak pattern export yüzeyini oluştur.
- [ ] yeni modül UI'larında framework-spesifik importları sınırlayacak CI/ESLint kuralını değerlendir ve güvenli şekilde uygula.

## Faz 2 — Motion layer

- [ ] motion duration/easing tokenlarını ekle.
- [ ] reduced-motion fallback'ını merkezileştir.
- [ ] reusable motion utility/pattern sınıfları ekle.
- [ ] Page/Surface/Card enter motion standardını uygula.
- [ ] hover/focus motion standardını uygula.
- [ ] Drawer/Popover geçişlerinin tokenlarla uyumunu doğrula.
- [ ] sürekli/dekoratif animation kullanımını engelleyen dokümantasyon kuralı ekle.
- [ ] motion regression/smoke testi ekle.

## Faz 3 — DataTable selection

- [ ] mevcut `DataTable` props sözleşmesini seçim için genişlet.
- [ ] `selectionMode="multiple"` desteğini kontrollü hale getir.
- [ ] explicit selection state ekle.
- [ ] select-all current page davranışını ekle.
- [ ] selected row görsel state'ini semantic tokenlarla tasarla.
- [ ] selection değişimini dışarı bildiren typed callback ekle.
- [ ] keyboard/ARIA selection davranışını test et.

## Faz 4 — BulkActionBar

- [ ] ortak `BulkActionBar` bileşenini ekle.
- [ ] selected count göstergesi ekle.
- [ ] default/danger bulk action tiplerini ekle.
- [ ] clear selection davranışı ekle.
- [ ] pending/loading state ekle.
- [ ] confirmation gerektiren aksiyon sözleşmesini ekle.
- [ ] küçük motion enter/exit davranışını Motion katmanına bağla.
- [ ] mobile görünümü doğrula.

## Faz 5 — Query selection

- [ ] explicit/query selection union tipini ekle.
- [ ] "bu sayfadaki N kayıt seçildi" akışını ekle.
- [ ] "filtreye uyan tüm X kayıt" seçim akışını ekle.
- [ ] query selection için client'a tüm ID'leri taşımama kuralını uygula.
- [ ] excludedIds desteğini ekle.
- [ ] server-side selection resolver/helper oluştur.
- [ ] query/filter snapshot doğrulaması ekle.
- [ ] pagination değişiminde selection semantiğini test et.

## Faz 6 — Bulk action server contract

- [ ] ortak bulk action input şemasını tanımla.
- [ ] explicit/query selection server validation helper ekle.
- [ ] permission doğrulama örneği ekle.
- [ ] tenant/organization scope doğrulaması ekle.
- [ ] audit metadata standardını belirle.
- [ ] destructive action confirmation standardını bağla.
- [ ] büyük işlerin Automation'a devri için threshold/rehber ekle.

## Faz 7 — Pilot modüller

- [ ] Members listesinde çoklu seçim uygula.
- [ ] Members için güvenli bir bulk action pilotu ekle.
- [ ] İkinci bir modülde (documents/users uygunluk durumuna göre) selection + bulk action uygula.
- [ ] iki pilot modülde keyboard/mobile/hydration testlerini çalıştır.

## Faz 8 — Dokümantasyon ve geliştirici sözleşmesi

- [ ] `docs/ui/ERP_MOTION_SYSTEM.md` tamamla.
- [ ] `docs/ui/DATA_TABLE_SYSTEM.md` tamamla.
- [ ] `MODULE_DEVELOPMENT_GUIDE.md` içine zorunlu UI kuralları ekle.
- [ ] `MODULE_DEVELOPMENT_GUIDE_EN.md` eşleştir.
- [ ] scaffold template'in yeni DataTable sözleşmesini kullanmasını sağla.
- [ ] gerekirse `AI_MODULE_PROMPT.md` içine kısa platform özeti ekle.

## Faz 9 — CI / kalite kapısı

- [ ] shared UI varken modül içinde paralel DataTable implementation'ını tespit eden kontrol ekle.
- [ ] UI adapter dışındaki framework-spesifik import sınırını test et.
- [ ] selection unit testleri.
- [ ] bulk permission tests.
- [ ] query selection tests.
- [ ] reduced-motion smoke.
- [ ] hydration tests.
- [ ] typecheck.
- [ ] lint.
- [ ] module validate.
- [ ] module version/release checks.

## Tamamlanma kriteri

- [ ] Design System, Motion ve DataTable/Bulk Actions merkezi platform olarak çalışıyor.
- [ ] Modüller yeni UI sözleşmesini kullanıyor.
- [ ] Framework bağımlılığı ortak katmana taşınmış.
- [ ] Explicit + query selection güvenli şekilde destekleniyor.
- [ ] Büyük bulk işler worker/export pipeline ile uyumlu.
- [ ] Dokümantasyon ve modül geliştirme rehberi güncel.
- [ ] CI yeşil.
