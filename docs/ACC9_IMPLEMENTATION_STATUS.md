# ACC-9 — Uygulama durumu ve tamamlanma kriterleri

**Güncelleme:** 2026-11-16. Tek kurumlu, EUR, mevcut `defineCards` sözleşmesi kullanılır. UI tema/kayma düzenlemeleri başka bir iş akışının sorumluluğundadır.

## Tamamlanan çalışmalar

- [x] PR #177: ilk mimari/todo planı; ilk taslakla gerçek kod arasındaki farklar tespit edildi.
- [x] PR #179: muhasebe EÜR kapsamı ve veri kaynağı keşif/ADR taslağı.
- [x] PR #180 ve #181: geçmiş kategoriler, kasa defteri son gün ve sıralı bakiye düzeltmeleri.
- [x] PR #183: `defineCards` üzerinden ana panelde gelir, gider, fiş farkı ve belgesiz fiş kartları, kullanıcının kayıtlı panel düzeni.
- [x] PR #184: `/muhasebe/panel` finansal genel bakış; ay/çeyrek/yıl filtreleri; fiş toplamlarıyla aynı sorgu, grafik ve erişilebilir tablo; salt okunur öneriler.
- [x] Kullanıcı dokümantasyonu için elle yazılmış sayfalar `website/docs/kullanim/muhasebe/` altında; üretilen `website/docs/kullanim/moduller/accounting.md` `pnpm docs:modules` tarafından yönetilir.
- [x] PR #184 CI, Docs, Security, Vercel başarılı, ana dala birleştirildi.

## Mevcut PR'daki sertleştirme

- [x] Tarih dönemi yardımcıları saf fonksiyona ayrıldı.
- [x] Ay/çeyrek ilk/son gün ve geçersiz değer regresyon testleri eklendi.
- [x] Fatura başına ödenen/Skonto/açık tutar toplamlarının testleri eklendi.
- [x] Muhasebe modülü tanımında tam HGB çift taraflı muhasebe iddiası kaldırıldı; EÜR odaklı gerçek kapsam belirtildi.
- [x] Module v1.22.6, `releases.json`, generated docs ve Türkçe website hesaplama rehberi güncellendi.
- [x] PR #185 doğruluk testleri ve EÜR kapsam düzeltmesi CI/Docs/Security/Vercel başarılı şekilde main'e alındı.
- [x] PR #186 banka mutabakatı önerisi ve PR #188 premium hafif grafik tasarımı main'e alındı.

## Kalan yüksek öncelikli işler

- [x] **KPI mutabakatı:** Dashboard/getAccountingStats brüt fiş kapsamı ile gelir-gider raporunun brüt genel toplamı eşitlendi; kategorisiz fişler ayrıca mutabakat farkı olarak taşınır. AI özeti brüt toplam ve kategorisiz tutarları açıkça döndürür (PR #189).
- [x] **Tarih ve fiş denetimi:** yalıtılmış CI PostgreSQL üzerinde yıl geçişi, reversed/storno, virman, kategorisiz fiş, yıllık kapanış bakiyesi ve 501 faturalık sayfalama regresyonları eklendi (PR #192).
- [x] **Banka mutabakatı:** `OPEN` durumundaki banka hareketlerini salt okunur sayıp ilgili ekrana yönlendiren öneri (PR #186).
- [x] **Yaklaşan vergi tarihi:** mevcut ACC-8 vergi takviminden 45 gün içindeki ilk tarih salt okunur öneri olarak gösterilir; resmî tatil/özel uzatma sınırlaması açıkça belirtilir (PR #191).
- [ ] **Öneri kapsamı devamı:** açık borç zaten vadesi geçmiş fatura uyarısıyla kapsanıyor; aidat için mevcut members kartı ve modüller arası erişim kararı doğrulanmadan muhasebe kartı kopyalanmayacak.
- [x] **Performans:** vadesi geçmiş faturalar 250 kayıtlık cursor sayfalarında işlenir; fatura başına `openCents` semantiği korunur ve tek seferde tüm satırlar belleğe alınmaz (PR #190).
- [ ] **UX doğrulaması:** gerçek ekran görüntüleriyle masaüstü/mobil, yükleme/boş/hata/izin durumları; diğer UI agentinin değişiklikleriyle koordinasyon.
- [ ] **Dokümantasyon:** yeni özelliklerin kullanım örnekleri, görseller, alt sayfalara yönlendirmeler ve CI link testi; mevcut TR website yapısını koru.
- [ ] **İleriki SaaS:** tenant izolasyonu, çoklu para birimi ve çok dilli website ayrı ürün kararıdır; bugünkü işin engeli değildir.

## Geliştirme kuralları

1. Yeni dashboard framework oluşturma; mevcut `defineCards` kullan.
2. Fiş toplamları için `getBookingTotals`; hesaplama kopyası oluşturma.
3. Kartların yetkisi `accountingPermissions.view`; modüller arası erişimde `access`/yönetici onayı.
4. Öneriler salt okunur; ödeme, ihtar veya beyan için açık insan onayı gerekir.
5. Her muhasebe kod PR'ında modül sürümü ve release notu güncelle; `module:sync`, `docs:modules`, test, build ve CI yeşil olmadan birleştirme.
6. Üretilen docs sayfalarını elle yazılmış rehber sanma; generator çıktıları commit'lenmeli.
