# Muhasebe yol haritası — KOBİ, serbest çalışan ve dernek

**Hedef:** Küçük ve orta ölçekli işletmeler, serbest çalışanlar (Freiberufler) ve dernekler için tek
taraflı (EÜR / Ist-Versteuerung) muhasebe; vergi danışmanına DATEV ile devredilebilir.

**Karar (2026-10-31):** Tek taraflı kayıt kalır (seçenek A). Kategoriler SKR03/SKR04 hesap
numarası taşır; DATEV dışa aktarmada hesap/karşı hesap otomatik üretilir. Çift taraflı kayıt
(HGB bilanço, E-Bilanz) kapsam dışı.

**Fikir kaynakları** (yalnızca fikir ve kamuya açık standartlar; kod kopyalanmadı):
accounti, haben, RechnungsFee, hopps, OpenBilanz, german-accounting, ledermann/datev.
Standartlar: DATEV-Format (EXTF v7), SKR03/SKR04, UStVA-Kennzahlen, XRechnung/ZUGFeRD (EN 16931),
CAMT.053/MT940, SEPA pain.001/pain.008, GoBD.

## Durum

| Var | Eksik |
|---|---|
| ACC-1 … ACC-8 uygulandı (KDV, SKR03/04, DATEV, UStVA, EÜR, cari hesaplar, OPOS, banka içe aktarma, e-fatura, ihtarname, hash zinciri, Z3, AfA, vergi takvimi) | SEPA Lastschrift (pain.008) + mandat, hibe/Verwendungsnachweis |

## İş akışı (her aşama ayrı PR; sırayla)

### ACC-1 — Vergi temeli *(sonrakilerin hepsi buna dayanır)*
- [x] Fişte KDV: oran (0/7/19 %), net + vergi + brüt; gelirde USt, giderde Vorsteuer
- [x] Ayarlar: §19 küçük işletme (KDV 0, uyarı), Ist/Soll-Versteuerung, Kontenrahmen (SKR03 / SKR04)
- [x] Kategoriye SKR hesap numarası + varsayılan vergi anahtarı; hesap (kasa/banka) SKR numarası
- [x] Mevcut fişler: KDV 0 olarak taşınır (migration), raporlar değişmez
- [x] Faturalar: kalem KDV'si fişe net/vergi olarak aktarılır

### ACC-2 — Dışa aktarma ve vergi raporları
- [x] DATEV EXTF Buchungsstapel v7 (CSV, başlık satırı, BU-Schlüssel) + Kontenbeschriftungen
- [x] UStVA Kennzahlen (81, 86, 35/36, 41, 21, 66, 83 …), ay/çeyrek, her rakamın kaynağı (drill-down)
- [x] EÜR raporu (Anlage-EÜR satırlarına yakın gruplama)
- [x] §19 ciro sınırı uyarısı (panel kartı)

### ACC-3 — Cari hesaplar ve açık kalemler
- [x] Müşteri/tedarikçi kartı (adres, IBAN, USt-IdNr, vade), faturadan otomatik öneri
- [x] Teklif (Angebot) → fatura; gelen fatura kaydı
- [x] Açık kalemler (OPOS), yaşlandırma, kısmi/toplu ödeme, Skonto

### ACC-4 — Banka içe aktarma ve eşleştirme
- [x] CSV profilleri (otomatik tanıma, kullanıcı şablonu), CAMT.053, MT940
- [x] Eşleştirme önerisi: referans → tam tutar → yakın; "neden" açıklaması; kısmi/toplu
- [x] Özel/ticari ayrımı (Privatentnahme/Einlage) — serbest çalışan için
- [x] Düzeltmelerden kural öğrenme

### ACC-5 — Belge kutusu ve e-fatura
- [x] Belge yükleme, çift kayıt tespiti, fişe bağlama
- [x] Gelen XRechnung/ZUGFeRD okuma → fiş önerisi; isteğe bağlı AI (izin matrisiyle)
- [x] Giden fatura: XRechnung XML + ZUGFeRD PDF/A-3, §14 UStG zorunlu alan kontrolü

### ACC-6 — İhtarname ve ödeme
- [x] İhtar seviyeleri, ücret, gecikme faizi (§288 BGB), PDF/e-posta
- [x] Ödeme önerisi (Skonto önce), SEPA pain.001
- [ ] Aidatlar için SEPA Lastschrift pain.008 + mandat yönetimi — **eksik**

### ACC-7 — GoBD paketi
- [x] Zincirleme SHA-256 kayıt (fiş, storno, dışa aktarma) + doğrulama ekranı
- [x] Z3 veri teslimi ZIP (CSV + sağlama), yıllık arşiv
- [x] Kasa defteri günlük kapanış (Soll/Ist farkı)
- [x] Bütünlük kontrolleri: belgesiz fiş, numara boşluğu, vadesi geçmiş fatura

### ACC-8 — Ek özellikler
- [x] Duran varlık + doğrusal AfA, GWG / Sammelposten
- [x] Götürü giderler (ev ofisi, km, harcırah)
- [x] Vergi takvimi + iCal
- [x] Dernek: §62 AO rezervler, Kassenprüfer raporu, SKR49
- [ ] Hibe ve Verwendungsnachweis raporu — **eksik**

## Her aşamada
- Veri modeli değişikliği → migration + mevcut veriyle test; değiştirilemez kayıtlar storno ile düzeltilir.
- Modül standardı: izinler (`permissions.ts`), AI araçları (`ai.ts`), çeviriler (tr/de), rehber.
- Uçtan uca test (yerel veritabanı + tarayıcı), sürüm notu.
