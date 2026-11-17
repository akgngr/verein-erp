# E-fatura uygunluk testleri (1. aşama)

**Tarih:** 2026-11-17 · **İş akışı:** `.github/workflows/einvoice-conformance.yml`

Almanya'da EÜR veya e-fatura yazılımları için resmî bir sertifika yoktur. Bu nedenle giden e-faturalar, standartların kendi referans araçlarıyla otomatik olarak doğrulanır.

## Ne test edilir

`pnpm einvoice:corpus <klasör>` komutu, muhasebe modülünün **gerçek** üreticileriyle (`buildXRechnungUbl`, `buildCiiInvoice`, `toZugferdPdf`) sentetik örnekler üretir. Örnek verisi `tests/fixtures/einvoice-conformance.ts` dosyasındadır; gerçek kişi ya da kurum verisi içermez.

| Örnek | Kapsam |
|---|---|
| `standard` | %19 + %7 KDV, Leitweg-ID, IBAN |
| `partially-paid` | Kısmi ödeme (BT-113) |
| `small-business` | §19 UStG, USt-IdNr. yok, sicil numarası var (BR-CO-26) |
| `credit-note` | İptal faturası (381) ve önceki faturaya referans |

Her örnek üç biçimde üretilir: XRechnung UBL, EN 16931 CII ve ZUGFeRD PDF/A-3 (CII gömülü). Bu biçimler aşağıdaki araçlarla doğrulanır:

- **Mustang CLI** (sürümü ve sha256 özeti sabitlenmiştir):
  - EN 16931, XRechnung 3.0 ve Factur-X Schematron kuralları;
  - PDF/A-3b denetimi (gömülü veraPDF).
- **KoSIT validator**, resmî XRechnung yapılandırmasıyla (UBL örnekleri).

`invalid` veya KoSIT `reject` sonucu iş akışını başarısız yapar. Uyarı ve notlar özet ile rapor dosyalarında (artefakt) listelenir.

## Yerelde çalıştırma

```bash
pnpm einvoice:corpus einvoice-out
```

```bash
curl -sSfLo /tmp/mustang.jar https://repo1.maven.org/maven2/org/mustangproject/Mustang-CLI/2.26.0/Mustang-CLI-2.26.0.jar
```

```bash
scripts/einvoice-conformance/validate.sh einvoice-out /tmp/mustang.jar
```

Java 17 veya üzeri gerekir.

## İlk bulgular

- **Düzeltildi – BR-CO-26:** USt-IdNr. olmayan satıcıda kimlik eksikti, bu yüzden fatura geçersizdi. Kurum profilindeki sicil numarası artık BT-30 olarak yazılıyor. İkisi de eksikse uygulama içi doğrulama dışa aktarmayı engelliyor.
- **Açık uyarılar** (iş akışını başarısız yapmaz):
  - **BR-DE-TMP-32 (not):** teslim veya hizmet tarihi (BT-72 / BG-14) yapısal olarak verilmiyor. Hizmet dönemi şu an serbest metin olarak notta yer alıyor.
  - **PEPPOL-EN16931-R008:** CII'de teslimat bloğu boş.

  İkisi de fatura formuna yapısal bir teslim tarihi alanı eklenince giderilebilir.

## Sınırlar

- ZUGFeRD PDF'inin tabanı, betik ortamında uygulamanın fatura bileşeni yüklenemediği için sadeleştirilmiş bir yerleşimle üretilir. PDF motoru, fontlar, PDF/A-3 dönüşümü ve gömülü XML ise uygulamadakiyle aynıdır.
- KoSIT sürümü, iş akışı her çalıştığında en son yayından alınır ve özete yazılır. Haftalık çalışma, yeni kural setlerini erkenden yakalamak içindir.
- UStVA ve Anlage EÜR doğrulaması (ELSTER ERiC test modu) 2. aşamadır. ELSTER geliştirici kaydı gerektirir.
