# ACC-9 — Muhasebe Dashboard ve Ana Panel Kartları / DOC-1 Website Rehberleri

**Durum:** Revize teknik şartname ve uygulanabilir TODO; henüz uygulama değil  
**Tarih:** 2026-11-16  
**Kapsam:** Mevcut tek kurumlu Verein ERP muhasebe modülü, ortak dashboard kartları ve Türkçe website rehberleri  
**İlgili:** `docs/ACCOUNTING_ROADMAP.md`, `docs/AUTOMATION_ENGINE.md`  
**İş paketleri:** ACC-9 (yeni dashboard), DOC-1 (her PR için dokümantasyon)

> Önceki taslakta önerilen `defineModuleWidget` altyapısı, tenant seçici, çoklu para birimi filtresi, kart başına ayar veritabanı ve yeni grafik kütüphanesi **ilk sürüm kapsamından çıkarıldı**. Mevcut kodu yeniden yazmayın.

## 1. Doğrulanmış mevcut altyapı

| Konu | Gerçek dosya / sözleşme | Karar |
| --- | --- | --- |
| Kart sözleşmesi | `src/shared/types/dashboard.ts`: `defineCards`, `sm/md/lg`, `permission`, `href`, `render` | Aynen kullan |
| Kart örnekleri | `src/modules/members/cards/index.tsx` ve diğer modül kartları | Muhasebeye `cards/index.tsx` ekle |
| Kart keşfi | `src/modules/system/queries/dashboard.ts`, üretilen `src/dashboard-cards` | Mevcut kayıt/senkronizasyon mekanizmasını kullan |
| Kullanıcı düzeni | `src/modules/system/actions/dashboard-layout.ts`: `systemDashboardLayout`, yetki filtresi, reset | Yeni tablo/optimistic concurrency yok |
| Kart hata izolasyonu | `DashboardCardDefinition.render` sözleşmesi | Koru, hata testlerini ekle |
| Gelir-gider | `src/modules/accounting/queries/get-income-expense-report.ts`: `getIncomeExpenseReport(year)` | Önce mevcut yıl bazlı servisleri kullan |
| Açık kalemler | `src/modules/accounting/queries/invoices.ts`: `listInvoices`; AI katmanında `listOpenItems` kullanımını doğrula | Ortak hesaplama semantiğini koru; 500 kayıt limiti nedeniyle listeyi doğrudan toplam kaynağı yapma |
| Hesap bakiyeleri | `src/modules/accounting/queries/list-accounts.ts`: `listAccountBalances()` | Muhasebe hesap bakiyesi olarak etiketle; banka mutabakat bakiyesi sanma |
| Vergi ayarları | `src/modules/accounting/queries/get-settings.ts`: `getSettings().tax` | Ist/Soll ve §19 gösteriminde gerçek ayarları kullan |
| Website katalog testi | `tests/docs/module-docs.test.ts` ve `pnpm docs:modules` | Üretilen `website/docs/kullanim/moduller/accounting.md` dosyasını **elle düzenleme** |
| Mevcut muhasebe kapsamı | `docs/ACCOUNTING_ROADMAP.md` tek taraflı EÜR; `src/modules/accounting/module.config.ts` açıklaması çift taraflı diyor | PR-A'da gerçek davranışı inceleyip kararı kaydet |

Sistem bugün **tek kurumlu**, **EUR** ve mevcut **3 sütunlu** dashboard grid ile çalışır. Çoklu organizasyon/tenant, farklı para birimi, kullanıcıya özel kart filtreleri, drag/resize iyileştirmeleri ve kalıcı öneri yaşam döngüsü ayrı gelecekteki işlere bırakılır.

## 2. PR-A: Keşif, muhasebe kapsamı ve KPI tanımları (ilk iş)

- [ ] Mevcut muhasebe kayıt modeli, rapor hesaplamaları, taxMethod, fatura durumları ve UI akışını incele.
- [ ] Tek taraflı EÜR kararı ile modüldeki "çift taraflı" ifadesi arasındaki çelişkiyi ADR'de çöz. Kanıtlanmamış HGB/double-entry desteği vaat etme.
- [ ] Mevcut `getIncomeExpenseReport`, `listInvoices`/`listOpenItems`, `listAccountBalances`, `getSettings` ve ilgili servislerin gerçek çıktı tiplerini doğrula.
- [ ] Her KPI için veri kaynağı, statü filtresi, dönem, saat dilimi (Europe/Berlin), işaret, KDV, taxMethod, yuvarlama, storno, iade, boş durum ve veri tazeliğini yaz.
- [ ] Yıl bazlı rapor API'sinin ay/çeyrek filtrelerini destekleyip desteklemediğini belirle; ayrı hesaplama kopyası oluşturma.
- [ ] Fatura listesi 500 kayıtla sınırlı: toplamlar için tam/veritabanı aggregate yolunu belirle, eksik veriyle KPI üretme.
- [ ] İzin modelini ve `accounting` → `members` için `access` + gerekiyorsa `recommends` / yönetici onayını doğrula.
- [ ] KPI test fixture planı ve açık kararlar listesi oluştur; PR-A davranış değişikliği yapmasın.

## 3. ACC-9 Dashboard kartları ve gerçek veri kaynakları

| Kart | Başlangıç kaynağı | Kritik not |
| --- | --- | --- |
| Gelir | `getIncomeExpenseReport(year)` / `buildIncomeExpenseReport` | Raporla birebir mutabakat; dönem kapsamını kontrol et |
| Gider | Aynı rapor servisi | KDV ve storno semantiği aynı olmalı |
| Gelir − gider | Aynı rapor servisi | Kâr / nakit / tahakkuk kavramlarını karıştırma |
| Açık alacak | `listOpenItems` davranışı ve `invoices.ts` ödeme yardımcıları | Liste limitine dayanarak yanlış toplam üretme |
| Açık borç | Mevcut payable servislerini keşfet | Kaynak doğrulanmadan gösterme |
| Vadesi geçmiş | `invoices.ts` / aging yardımcıları | Berlin gün sınırı, kısmi ödemeler |
| Hesap bakiyeleri | `listAccountBalances()` | "Muhasebe hesabı bakiyesi" diye etiketle |
| Banka eşleşmemiş | Mevcut banka import/matching sorguları (PR-A'da kesinleştir) | Mutabakat durumunu doğrula |
| Vergi dönemi | `getSettings().tax` + mevcut vergi takvimi | Ist/Soll ayarını açık göster |
| Aidat | `members/queries/get-dues-stats.ts` veya accounting sync | Yetki + modüller arası erişim onayı; zaten members kartı var, kopyalama ihtiyacını sorgula |
| Eksik belge | Belge zorunluluğu kuralı henüz doğrulanmadı | Tanım netleşene kadar sonraya bırak |
| Trend grafiği | Mevcut rapor servisinden dönem serileri | Önce CSS/SVG çubuk + erişilebilir tablo |

Tüm kartlarda yetki kontrolü sunucu tarafında kalır. Görüntülenemeyen kartın veri sorgusu çalıştırılmamalı. Yetki geri alındığında kart görünmez ve veri erişimi engellenir. Kart hatası diğer kartları durdurmaz.

## 4. ACC-9 uygulama TODO

### PR-B — Muhasebe ekranı
- [ ] Mevcut `/muhasebe` route ve UI'ı incele; mevcut akışı kırmadan dashboard ekle.
- [ ] Ortak dönem seçimi: bu ay / bu çeyrek / bu yıl; servis desteklemiyorsa önce veri sözleşmesini genişlet.
- [ ] İlk KPI seti: gelir, gider, açık alacak, vadesi geçmiş, hesap bakiyesi.
- [ ] EUR gösterimi, kaynağa git bağlantıları, hesaplama açıklaması ve son güncelleme.
- [ ] Mevcut 3 sütunlu düzen ile uyumlu responsive kartlar.
- [ ] Grafik için başlangıçta SVG/CSS ve erişilebilir tablo alternatifi; yeni kütüphane yok.
- [ ] Loading/empty/error ve farklı kullanıcı rolü testleri.
- [ ] Aynı PR'da Türkçe website kullanım rehberini ekle.

### PR-C — Ana dashboard entegrasyonu
- [ ] `src/modules/accounting/cards/index.tsx` içinde `defineCards([...])` ile seçilmiş KPI kartlarını kaydet.
- [ ] `src/dashboard-cards` için mevcut module sync akışını kullan.
- [ ] Kart başlığı, ikon, `href`, `permission`, `defaultVisible` ve çeviri anahtarlarını tanımla.
- [ ] Mevcut `systemDashboardLayout` ile kart ekleme/kaldırma/sıralama ve reset davranışını test et.
- [ ] Muhasebe ekranı ile ana panelde aynı kaynak/aynı dönem için tutar eşitliğini doğrula.
- [ ] Website'de ana panele kart ekleme ve yetki rehberini yayımla.

### PR-D — Kural tabanlı öneriler
- [ ] Vadesi geçmiş faturalar, eşleşmemiş banka işlemleri, yaklaşan vergi tarihleri için salt okunur kurallar.
- [ ] Her öneride neden, kaynak kayıt, önem derecesi ve güvenli yönlendirme.
- [ ] İlk sürüm stateless; kalıcı recommendation tablosu, snooze/audit workflow ve AI eylemleri yok.
- [ ] Kapatma tercihi eklenecekse kural + ilgili durum sürümüyle anahtarla; yeni bir ihlal eski kapatma nedeniyle gizlenmesin.
- [ ] Öneriler otomatik ödeme, ihtar, fatura, vergi beyanı oluşturamaz.
- [ ] Yanlış pozitif, eski veri, rol/izin ve boş durum testleri.
- [ ] Website'de önerilerin ne anlama geldiğini açıkla.

### PR-E — Website dokümantasyon bütünlüğü
- [ ] Üretilen modül katalog dosyası ile elle yazılan rehberleri açıkça ayır.
- [ ] `website/docs/kullanim/muhasebe/` önerisini mevcut website router/sidebar ile doğrula.
- [ ] Muhasebe dashboard, KPI tanımları, filtreler, kartlar, öneriler ve sorun giderme rehberlerini **Türkçe** yaz.
- [ ] Gerçek uygulama ekranından demo verili, kişisel veri içermeyen görseller ekle.
- [ ] Üretilen katalog sayfasına bağlantı gerekiyorsa generator kaynak şablonunu düzenle, `pnpm docs:modules` çalıştır.
- [ ] `tests/docs/module-docs.test.ts`, website build ve link kontrollerini çalıştır.
- [ ] DE/EN dokümantasyon ayrı i18n ürün kararı verilene kadar kapsam dışı.

### PR-F — Sertleştirme
- [ ] KPI toplamları ile muhasebe raporları ve AI asistanı çıktıları için eşitlik testleri.
- [ ] 500+ fatura, yıl geçişi, saat dilimi, storno, kısmi ödeme, §19 ve Ist/Soll fixture'ları.
- [ ] Rol bazlı yetki, kart hata izolasyonu, modül devre dışı kalması ve layout kaydı testleri.
- [ ] Büyük veri performansı ve gereksiz sorgu sayısı ölçümü.
- [ ] `module.config.ts` ve `releases.json` sürüm eşitliği, `module:sync`, typecheck ve CI.
- [ ] Website rehberlerinin uygulanmış davranışla eşleştiğini doğrula.

## 5. DOC-1 — Her muhasebe PR'ı için zorunlu website dokümantasyonu

- [ ] `docs/` altında teknik kararlar, KPI formülleri ve test kapsamı.
- [ ] `website/` altında kullanıcıya dönük Türkçe rehber: amaç, gerekli yetki, adım adım kullanım, örnek, sınırlamalar.
- [ ] Üretilen `website/docs/kullanim/moduller/*.md` dosyalarını **elle düzenleme**; yalnız generator üzerinden güncelle.
- [ ] Değişen arayüz için gerçek demo ekran görüntüleri; hassas veri kullanma.
- [ ] Navigasyon, iç bağlantılar, docs generator testi ve website build doğrulaması.
- [ ] PR açıklamasında dokümantasyon dosyaları ve güncelleme gerekmiyorsa gerekçe.
- [ ] Modül değiştiyse sürüm artır, `releases.json` eşitle, gerekli CI kontrollerini çalıştır.

## 6. Daha sonraki SaaS / ileri özellikler (bu iş kapsamında değil)

- Çoklu tenant/organizasyon seçici ve tenant-scoped cache anahtarları.
- Çoklu para birimi ve döviz değerleme.
- Kart başına kalıcı filtre/ayar şeması ve özel widget framework.
- Gelişmiş interaktif grafik kütüphanesi (kanıtlanmış ihtiyaç halinde ADR).
- Kalıcı öneri yaşam döngüsü ve AI destekli açıklama (ayrı güvenlik değerlendirmesi).
- Almanca/İngilizce website dokümantasyonu (i18n altyapısı kararı sonrası).

## 7. Kabul kriterleri

1. Yeni widget altyapısı veya gereksiz paket kurulmaz.
2. Mevcut kart sözleşmesi, kullanıcı düzeni ve kart hata izolasyonu korunur.
3. Her KPI mevcut muhasebe hesaplama servisleriyle mutabık ve kaynağı açıklanabilirdir.
4. Yanlış eksik/veri limitli toplam, uydurma sıfır veya yanıltıcı "kâr" etiketi gösterilmez.
5. Yetkisiz kullanıcı finansal kartı veya verisini göremez; modüller arası erişim kuralları korunur.
6. Öneriler salt okunurdur, hiçbir finansal yan etki oluşturmaz.
7. Türkçe website rehberleri gerçek uygulamayı açıklar; otomatik üretilen katalog dosyası elle düzenlenmez.
8. Her uygulama PR'ında test, dokümantasyon ve modül sürüm kontrolleri tamamlanır.
