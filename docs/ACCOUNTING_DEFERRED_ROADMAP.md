# Muhasebe — ertelenen işler yol haritası

**Durum:** Plan (uygulanmadı) · **Tarih:** 2026-11-17
**Kaynak:** [ACC-9 uygulama durumu](./ACC9_IMPLEMENTATION_STATUS.md) içinde "kapsam dışı" bırakılan dört başlık.

Sıralama: R1 ve R2 artık bağımsızdır (izole kurulumda para birimi ayarı zaten kurulum başınadır); R2 kendi önceliğiyle yürür.
Panel düzeni (R3) ve Almanca website (R4) bağımsızdır ve paralel yürüyebilir.

| # | İş | Bağımlılık | Tahmini boyut | Risk |
|---|----|-----------|---------------|------|
| R1 | Barındırılan çoklu müşteri: izole kurulum + yönetim katmanı (ADR 0001) | — | Büyük (6–8 PR, çoğu altyapı) | Orta: operasyon; veri sızıntısı riski yapısal olarak düşük |
| R2 | Çoklu para birimi | — | Büyük (4 PR) | Orta: GoBD/DATEV uyumu |
| R3 | Panel kartlarını sürükle/boyutlandır | — | Orta (2–3 PR) | Düşük |
| R4 | Almanca website dokümantasyonu | — | Orta (2 PR + sürekli) | Düşük |

---

## R1 — Barındırılan çoklu müşteri (izole kurulum + yönetim katmanı)

Karar: [ADR 0001](./adr/0001-isolated-deployment-per-customer.md). Her müşteri **ayrı uygulama + ayrı veritabanı + ayrı anahtarlar** ile çalışır. Ortak veritabanlı çok kiracılık (`organizationId` + RLS) ana ürüne **eklenmez**. Modül kodu tek kurumlu kalır.

- **R1.0 Karar:** ADR 0001 onayı (ürün sahibi).
- **R1.1 Müşteri açma:** Tek komutla Postgres veritabanı ve kullanıcı, secret'lar (`AUTH_SECRET`, `DATA_ENCRYPTION_*`, `MAIL_ENCRYPTION_KEY`), dosya deposu, alan adı ve TLS, web + worker konteyneri, migrator çalıştırma, ilk yönetici daveti.
- **R1.2 Aşamalı yayın:** Sürüm kanalları (test grubu → genel); müşteri başına sürüm sabitleme; geriye uyumlu migration kuralı (genişlet → taşı → daralt); otomatik geri alma.
- **R1.3 Yedek ve geri yükleme:** Müşteri anahtarıyla şifreli günlük yedek (bekleyen "şifreli yedek" işiyle birleşir); geri yükleme provası; müşteri isteğiyle tam dışa aktarma ve silme.
- **R1.4 İzleme:** Sağlık uçları, worker kuyruğu, disk ve migration durumu. Kişisel veri içermeyen merkezi log/metrik.
- **R1.5 Maliyet:** Uyuyan konteyner (scale-to-zero), küçük kaynak profilleri, ortak Postgres kümesinde veritabanı başına kotalar.
- **R1.6 Faturalama ve plan:** Plan → modül seti/limitler. Yönetim katmanı yalnız işletme verisi tutar, müşteri verisine erişmez.
- **R1.7 Self-host paketi:** Aynı imajlarla `docker compose` kurulumu, güncelleme rehberi.
- **R1.8 Testler (kapı):** İki müşteri kurulumunun ağ, veritabanı, dosya ve anahtar düzeyinde birbirine erişemediğinin otomatik doğrulaması; yedekten geri yükleme testi; aşamalı yayın + geri alma provası.

Kabul: Yeni müşteri tek komutla açılır, güncellenir, yedeklenir ve silinir. Hiçbir müşteri kurulumu başka müşterinin verisine, dosyasına veya anahtarına erişemez. Modül kodunda kurum filtresine gerek yoktur.

**Sonra (opsiyonel):** Çok küçük müşteriler için ortak veritabanlı "Lite" ürün yalnız ayrı bir ADR ile, sınırlı modül setiyle ve üçüncü taraf modülsüz düşünülür.

## R2 — Çoklu para birimi

Hedef: EUR dışı faturalar ve banka hesapları; raporlama kurum para biriminde.

- **R2.0 Karar:** fiş tutarı (orijinal para birimi) + kur + kurum para birimi tutarı birlikte saklanır; kur kaynağı (ECB günlük) ve tarihi.
- **R2.1 Model:** `currency`, `fxRate`, `amountBaseCents` alanları; mevcut kayıtlar `EUR`, kur 1.
- **R2.2 Kur servisi:** ECB kurlarını pg-boss ile günlük çek; elle kur girişi; kur farkı (Kursdifferenz) fişi.
- **R2.3 Çıktılar:** fatura PDF/XRechnung/ZUGFeRD para birimi; DATEV EXTF `WKZ`/kur sütunları; UStVA/EÜR yalnız EUR karşılığıyla.
- **R2.4 Panel/raporlar:** tüm KPI'lar kurum para biriminde; orijinal tutar ayrıntıda gösterilir.

Kabul: EUR dışı fatura ödendiğinde kur farkı doğru fişlenir; DATEV dışa aktarımı vergi danışmanı test dosyasıyla doğrulanır.

## R3 — Panel kartlarını sürükle / boyutlandır

Mevcut: `defineCards` + kullanıcının kart seçimi ve sırası kayıtlı.

- **R3.1 Düzen şeması:** kart başına `size: "sm" | "md" | "lg"` (1/2/4 sütun); düzen şema sürümü ve göç.
- **R3.2 Etkileşim:** düzenleme modunda sürükle-bırak (klavye ile yukarı/aşağı alternatifi, erişilebilirlik zorunlu), boyut menüsü.
- **R3.3 Sabitlenen kartlar:** modülün varsayılan konumu (örn. AI durum kartı sağ üst) kullanıcı tarafından değiştirilebilir.
- **R3.4 Testler:** yetkisi kaldırılan / modülü kapatılan kartın düzenden düşmesi, eski şemadan göç.

## R4 — Almanca website dokümantasyonu

- **R4.1 Docusaurus i18n:** `de` yerel ayarı, dil seçici, `website/i18n/de/` yapısı; `docs.yml` iki dili derler.
- **R4.2 Üretilen sayfalar:** `pnpm docs:modules` modül kataloğunu `messages/de.json` ile Almanca da üretir.
- **R4.3 El yazımı rehberler:** önce muhasebe (panel, KPI kuralları, kartlar), sonra diğer modüller.
- **R4.4 CI kapısı:** TR sayfası olup DE karşılığı olmayan rehber için uyarı (önce uyarı, sonra hata).

## Sonraki adım

Her başlık kendi ADR/şartname PR'ı ile başlar; uygulama, kullanıcı onayı ile sırayla açılır.
