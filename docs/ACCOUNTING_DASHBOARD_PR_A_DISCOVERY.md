# PR-A — Muhasebe kapsamı ve Dashboard KPI keşfi (ADR taslağı)

**Tarih:** 2026-11-16  
**Durum:** Keşif tamamlandı (sınırlı dosya incelemesi); muhasebe kapsamı kararı için uygulama düzeyinde doğrulama bekleniyor  
**İlgili plan:** `docs/ACCOUNTING_DASHBOARD_WIDGETS_WEBSITE_DOCS_TODO.md` (PR #177; henüz main'e birleşmemiştir)

## 1. Doğrulanan kod ve bulgular

| Dosya | Bulgular | Karar |
| --- | --- | --- |
| `docs/ACCOUNTING_ROADMAP.md` | Tek taraflı EÜR / Ist-Versteuerung seçimi, HGB bilanço kapsam dışı | Ürün vaatlerini bu kapsamla sınırla; modelin gerçekten buna uyduğunu doğrula |
| `src/modules/accounting/module.config.ts` | Açıklama "çift taraflı defter tutma" diyor; `version: 1.22.1` (inceleme anında) | Çelişki var; değişiklikten önce mevcut şema ve kayıt semantiğini denetle |
| `src/modules/accounting/queries/get-income-expense-report.ts` | `getIncomeExpenseReport(year)` doğrudan `buildIncomeExpenseReport(year)` çağırıyor | Gelir/gider için mevcut servis temel kaynak; ay/çeyrek desteği henüz bu arayüzde yok |
| `src/modules/accounting/queries/invoices.ts` | `listInvoices` en fazla 500 kayıt getiriyor; açık tutar `openCents` ile hesaplanıyor | KPI toplamları bu sınırlı listeyi toplayarak hesaplanamaz |
| `src/modules/accounting/queries/list-accounts.ts` | `listAccountBalances()` aktif hesaplar için `accountBalanceAt` kullanıyor | Muhasebe hesabı bakiyesi; gerçek banka mutabakat bakiyesi olduğu varsayılamaz |
| `src/modules/accounting/queries/get-settings.ts` | `getSettings().tax` mevcut vergi ayarlarını döndürüyor | Ist/Soll/§19 gösterimi için gerçek ayarları kullan |
| `src/shared/types/dashboard.ts` | `defineCards`, `sm/md/lg`, server `render`, yetki, bağlantı ve hata izolasyonu | Yeni widget framework yok |
| `src/modules/system/queries/dashboard.ts` | Modül etkinliği ve rol yetkisine göre kart filtreleme; kayıtlı düzen okuma | Mevcut keşif ve filtreleme korunacak |
| `src/modules/system/actions/dashboard-layout.ts` | Kullanıcıya özel kart düzeni kaydı/reset, geçersiz kartların filtrelenmesi | Yeni layout tablosu yok |
| `src/modules/members/cards/index.tsx` | Gerçek kart örneği, `getDuesStats` ile aidat kartı zaten mevcut | Aynı aidat kartını muhasebede kopyalama gereğini sorgula |
| `tests/docs/module-docs.test.ts` | Üretilen katalog içeriğinin `renderModuleDocs` ile birebir eşitliği test ediliyor | `website/docs/kullanim/moduller/accounting.md` elle düzenlenmez |

## 2. ADR-ACC-9-001 — Muhasebe kapsamı (önerilen karar, henüz kesin değil)

**Öneri:** Mevcut ürün kapsamını `docs/ACCOUNTING_ROADMAP.md` ile uyumlu tek taraflı EÜR odaklı muhasebe olarak belgelemek; HGB çift taraflı muhasebe uygunluğu doğrulanmadıkça ürün iddiasında bulunmamak. Bu PR, modül açıklamasını değiştirmez. Önce şema, muhasebe fişi/hesap karşılığı, rapor üretimi, storno ve vergi davranışını uçtan uca inceleyerek karar kesinleştirilmelidir.

**Açık sorular:** Fiillerde çift kayıt mı tutuluyor? DATEV dışa aktarma için sentetik karşı hesap kullanımı nasıl? Ist/Soll seçimi gelir/gider raporunun tarih temelini etkiliyor mu? Dernekler için SKR49 ve farklı vergi alanları hangi kapsamda destekleniyor? Sonuca göre `module.config.ts`, roadmap ve kullanıcı rehberi birlikte güncellenmeli.

## 3. KPI sözleşmeleri — başlangıç taslağı

| KPI | Kaynak | Dönem ve hesaplama doğrulaması | Açık karar |
| --- | --- | --- | --- |
| Gelir | `getIncomeExpenseReport(year)` / report builders | Yıllık raporla aynı işaret, KDV, storno; ay/çeyrek desteği yoksa servis genişlet | Dönem API'si ve gelir tanımı |
| Gider | Aynı rapor | İade ve vergi ayrımı | Dönem API'si |
| Net sonuç | Aynı rapordan gelir − gider | "Kâr" değil, kullanılan hesaplama esasını açıklayan etiket | EÜR / tahakkuk etiketi |
| Açık alacak | `invoices.ts` + `invoice-payments` | Sadece uygun `INVOICE/ISSUED`, açık tutar ve kısmi ödeme | Limit uygulanmayan aggregate |
| Vadesi geçmiş | `invoices.ts` aging | Gün sınırı Europe/Berlin; vade, kısmi ödeme | `isOverdue` Date.now−24h mantığının doğruluğu |
| Hesap bakiyesi | `listAccountBalances()` | Aktif hesapların `accountBalanceAt` değerleri | Hangi hesap türleri gösterilecek |
| Aidat | `members/queries/get-dues-stats.ts` | Mevcut members kartıyla aynı değer | Accounting kartı gerekli mi? Yetki/erişim onayı |
| Banka eşleşmemiş | Mevcut banka sorguları, henüz belirlenmedi | Gerçek import/matching statüleri | Kaynak fonksiyon |
| Vergi takvimi | `getSettings().tax` + vergi takvimi | Dönem, Ist/Soll, §19, uyarı kaynağı | Kaynak fonksiyon |
| Eksik belge | Henüz tanımlanmadı | Zorunlu belge kuralı olmadan gösterme | V1 dışı |

**Ortak kurallar:** Para birimi EUR; tarih sınırları Europe/Berlin; tutarlar kuruş/Decimal doğruluğunda; kaynak fişe drill-down; yetki sunucu tarafında; boş veri uydurma sıfır değil; verinin son güncellenme zamanı ve kapsamı açık.

## 4. PR-A takip TODO

- [x] Mevcut kart sözleşmesini ve layout kaydını doğrula.
- [x] Gelir-gider, fatura ve hesap bakiyesi sorgularını bul ve yüzeysel denetle.
- [x] Otomatik üretilen website katalog testini doğrula.
- [x] EÜR / çift taraflı açıklama çelişkisini kaydet.
- [ ] `services/report-builders`, `services/tax`, muhasebe Prisma şeması ve muhasebe kayıt servislerini derinlemesine denetle.
- [ ] AI `listOpenItems` aracının çağırdığı gerçek sorguyu ve veri sınırlarını doğrula.
- [ ] Banka ve payable KPI kaynaklarını bulup statü semantiğini belgeye ekle.
- [ ] Dönem filtreleri ve Ist/Soll davranışını test fixture'larıyla doğrula.
- [ ] Mevcut `access`/`recommends` kuralı ve yönetici onayıyla aidat erişimini doğrula.
- [ ] ADR'yi kesinleştir, ilgili module config/roadmap/website rehber değişikliklerini ayrı uygulama PR'ında yap.
- [ ] PR-A ve ACC-9 planı main'e birleşmeden birbirine bağımlı kod PR'larını başlatma.

## 5. Dokümantasyon kuralı

`website/docs/kullanim/moduller/accounting.md` generator çıktısıdır. Elle yazılacak kullanıcı rehberleri için `website/docs/kullanim/muhasebe/` yolu önerilir; gerçek router/sidebar düzeni incelendikten sonra kesinleştir. Website bugün Türkçe; DE/EN i18n kapsam dışı. Her kullanıcıya yansıyan uygulama PR'ı aynı PR içinde website rehberini günceller.

## 6. Bu PR'ın sınırı

Yalnızca keşif/ADR taslağıdır; kod, migration, modül sürümü veya website sayfası değiştirmez. Hiçbir testin çalıştırıldığı iddia edilmez. PR #177'deki planla birlikte gözden geçirilmelidir.
