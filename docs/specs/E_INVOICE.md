# E-fatura (E-Rechnung) — teknik şartname ve yapılacaklar

Durum: taslak · Kapsam: `accounting` modülü · Sahip: muhasebe · Tarih: 2026-11-07

## 1. Amaç

Almanya'daki B2B e-fatura zorunluluğunu (Wachstumschancengesetz, § 14 UStG, BMF-Schreiben) dernek
ve küçük işletme kullanıcıları için eksiksiz karşılamak: e-fatura **almak**, **doğrulamak**,
**okunabilir göstermek**, **kesmek**, **düzeltmek/iptal etmek** ve GoBD'ye uygun **saklamak**.

## 2. Hukuki çerçeve (özet)

| Tarih | Kural |
| --- | --- |
| 1.1.2025 | Yurt içi B2B işlemlerde her işletme e-fatura **alabilmeli** (geçiş süresi yok). |
| 1.1.2027 | Önceki yıl cirosu > 800.000 € olanlar e-fatura **kesmek** zorunda. |
| 1.1.2028 | Tüm işletmeler e-fatura kesmek zorunda; kâğıt/PDF yalnız istisnalarda. |

- **E-fatura** = EN 16931'e uygun yapılandırılmış veri: **XRechnung** (UBL veya CII) ya da
  **ZUGFeRD ≥ 2.0.1** (MINIMUM ve BASIC-WL profilleri hariç; EN16931/EXTENDED geçerli).
- **İstisnalar:** özel kişilere (B2C) faturalar; ≤ 250 € küçük tutarlı faturalar (Kleinbetragsrechnung,
  § 33 UStDV); vergiden muaf bazı işlemler. **Kleinunternehmer (§ 19 UStG)** için kaynaklar çelişkili
  (§ 34a UStDV ile kesme yükümlülüğünden muafiyet bildiriliyor); uygulama ayarla seçtirir, karar
  kullanıcının ve vergi danışmanınındır.
- **Dernekler:** yalnız işletme (Unternehmer) olarak yaptıkları işlerde (Zweckbetrieb, wirtschaftlicher
  Geschäftsbetrieb, kira vb.) ve işletmelere kesilen faturalarda kapsamdadır. Aidat, bağış ve
  özel kişilere kesilen belgeler kapsam dışıdır.
- **Saklama (GoBD, § 147 AO):** gelen ve giden e-faturanın **orijinal XML'i değiştirilmeden** 8 yıl
  (2025'ten itibaren) saklanır; okunabilir görüntü üretilebilmelidir.
- **Düzeltme:** kesilmiş fatura silinemez/değiştirilemez; iptal veya düzeltme **yeni bir belgeyle**
  (Stornorechnung / Rechnungskorrektur) yapılır ve o belge de e-fatura olmalıdır.

## 3. Mevcut durum

| Alan | Var | Not |
| --- | --- | --- |
| Giden XRechnung 3.0 (UBL) | ✓ | `services/einvoice-out.ts` |
| Giden ZUGFeRD (PDF/A-3 + CII EN16931) | ✓ | `services/einvoice-cii.ts`, `zugferd-pdf.ts` |
| Gelen XRechnung/ZUGFeRD okuma (XML, PDF'e gömülü) | ✓ | `services/einvoice-in.ts`, `payable-import.ts` |
| Gelen faturada § 14 zorunlu alan kontrolü | ✓ | `section14Checks` |
| E-postadan gelen fatura içe alma (IMAP) | ✓ | `mail` + `payable-import` |
| Orijinal dosyanın saklanması (sha256) | ✓ | `AccountingPayable.storagePath/sha256` |
| İptal/düzeltme faturası (Storno, TypeCode 381/384) | ✗ | İptal yalnız durumu `CANCELLED` yapıyor. |
| EN 16931 / XRechnung kural doğrulaması (BR-*) | ✗ | Yalnız eksik alan kontrolü (`xrechnungIssues`). |
| Gelen e-faturanın okunabilir görünümü | ✗ | Ayrıştırılan veri kayda yazılıyor, belge görünümü yok. |
| Müşteriye göre biçim seçimi ve zorunluluk uyarısı | ✗ | Biçim kullanıcı seçimine kalmış. |
| SEPA otomatik ödemede yetki bilgisi (PaymentMeans 59) | ✗ | Yalnız havale (58). |
| Peppol gönderimi | ✗ | Kapsam dışı (ücretli aracı gerekir). |

## 4. Gereksinimler

### EI-1 İptal ve düzeltme faturası (zorunlu)
- Kesilmiş (`ISSUED`/`PAID`) faturanın iptali **iptal faturası** üretir: yeni numara (`ST-YYYY-NNNN`),
  aynı kalemler eksi tutarla, `TypeCode 381` (Gutschrift/Credit note) — XRechnung'da `CreditNote`
  belgesi, CII'de `381`, orijinal faturaya referans (BT-25 `PrecedingInvoiceReference`, BT-26 tarih).
- Muhasebe: ters fiş (mevcut ödeme/fiş mantığıyla), açık kalem kapanır; kısmi ödenmiş faturada iptal
  yerine kullanıcıya düzeltme seçeneği gösterilir.
- PDF + XRechnung + ZUGFeRD çıktıları normal faturayla aynı uçlardan alınır.
- Orijinal fatura `CANCELLED` olur ve iptal faturasına bağlanır; iki belge de silinemez (GoBD).

### EI-2 Doğrulama
- Saf TypeScript doğrulayıcı (`services/einvoice-validate.ts`): EN 16931 ve XRechnung'un en sık
  ihlal edilen kuralları — en az: BR-01…BR-16 (zorunlu alanlar), BR-CO-10/13/15 (toplam tutarlar),
  BR-S/BR-Z/BR-E/BR-AE (KDV kategorileri), BR-DE-1…BR-DE-23 (Leitweg/BT-10, satıcı iletişim,
  ödeme bilgisi, IBAN).
- Giden faturada: kesmeden önce doğrulama, hata varsa kesme engellenir, uyarı varsa gösterilir.
- Gelen faturada: içe alırken doğrulama sonucu kaydedilir ve listede gösterilir (ret değil, uyarı).
- İsteğe bağlı: ayarlardan **KoSIT doğrulayıcı adresi** (kendi sunucusunda çalışan ücretsiz
  `itplr-kosit/validator` HTTP modu) girilirse tam Schematron doğrulaması da yapılır.
- Kural kodları ve tr/de mesajları birlikte; birim testleri örnek XML'lerle.

### EI-3 Okunabilir görünüm (gelen e-fatura)
- Gelen faturanın XML'inden HTML görünüm (satıcı, alıcı, kalemler, KDV dökümü, ödeme bilgisi,
  notlar) ve aynı içerikten **PDF** (saklama/denetim için).
- Görünüm her zaman **saklanan orijinal XML'den** üretilir; veritabanı alanlarından değil.

### EI-4 Biçim seçimi ve zorunluluk
- Cari (müşteri) kaydına **e-fatura alıcısı** türü: `B2B` (işletme / kamu) · `B2C` (özel kişi).
  Kamu için Leitweg-ID zorunlu.
- Ayarlar: **e-fatura kesme zorunluluğu** (otomatik: 2027/2028 kuralı + önceki yıl cirosu ayarı;
  Kleinunternehmer seçeneği).
- Kesme anında: B2B ve zorunluluk varsa varsayılan çıktı ZUGFeRD veya XRechnung, düz PDF
  "e-fatura değildir" uyarısıyla; ≤ 250 € ve B2C istisnaları otomatik.
- Panelde ve muhasebe ayarlarında 2027/2028 hazırlık uyarısı (eksik satıcı bilgileri, Gläubiger/IBAN).

### EI-5 SEPA otomatik ödeme bilgisi
- Faturada ödeme yolu `SEPA_DEBIT` seçilebilir; müşteri yetkisi varsa PaymentMeans `59`,
  BT-89 yetki referansı, BT-90 Gläubiger-ID, BT-91 borçlu IBAN (maskeli değil, standart gereği).

### EI-6 Saklama ve dışa aktarım
- Giden e-faturanın üretilen XML'i kesme anında **dondurulup** saklanır (sha256); sonradan
  ayarlar değişse de aynı belge verilir.
- GoBD Z3 dışa aktarımına e-fatura XML'leri eklenir.

## 5. Kapsam dışı
- Peppol erişim noktası (ücretli aracı gerekir); ileride eklenti modülü olarak düşünülebilir.
- Otomatik ciro hesabıyla hukuki karar vermek (uygulama yalnız hatırlatır).

## 6. Kabul ölçütleri
- İptal faturası XRechnung ve ZUGFeRD çıktıları doğrulayıcıdan hatasız geçer; muhasebe bakiyesi sıfırlanır.
- Hatalı giden fatura kesilemez; kural kodu ve açıklaması tr/de gösterilir.
- Gelen e-fatura her zaman orijinal XML'den okunabilir görünüm ve PDF verir.
- B2C ve küçük tutarlı faturalar zorunluluk uyarısı üretmez; B2B'de varsayılan e-fatura olur.
- Tüm değişiklikler testli, tr/de çevirili, sürüm notlu; migration'lar mevcut veriyi bozmaz.

## 7. Yapılacaklar

- [ ] **EI-1** İptal faturası: şema (`kind CREDIT_NOTE`, `correctsInvoiceId`, numara serisi `ST-`)
- [ ] EI-1 UBL `CreditNote` ve CII `381` üretimi + BT-25/26 referansı, birim testleri
- [ ] EI-1 iptal akışı: ters fiş, açık kalem, arayüz (iptal → iptal faturası bağlantısı), PDF
- [ ] **EI-2** TS doğrulayıcı (BR-*, BR-CO-*, KDV kategorileri, BR-DE-*), testler
- [ ] EI-2 giden faturada kesme öncesi doğrulama; gelen faturada sonuç kaydı ve listede rozet
- [ ] EI-2 isteğe bağlı KoSIT doğrulayıcı adresi (ayar + HTTP istemcisi + zaman aşımı)
- [ ] **EI-3** gelen e-fatura okunabilir görünümü (HTML) ve PDF, orijinal XML'den
- [ ] **EI-4** cari türü (B2B/B2C/kamu), zorunluluk ayarları, kesmede varsayılan biçim ve uyarılar
- [ ] **EI-5** SEPA_DEBIT ödeme yolu: PaymentMeans 59 + BT-89/90/91
- [ ] **EI-6** giden XML'in kesme anında dondurulması; Z3 dışa aktarımına ekleme
- [ ] Belgeler: README, ACCOUNTING_ROADMAP, Verfahrensdokumentation metni güncellemesi
