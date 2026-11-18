# Muhasebe — ertelenen işler yol haritası

**Durum:** Plan (uygulanmadı) · **Tarih:** 2026-11-17
**Kaynak:** [ACC-9 uygulama durumu](./ACC9_IMPLEMENTATION_STATUS.md) içinde "kapsam dışı" bırakılan dört başlık.

Sıralama: R1 ve R2 artık bağımsızdır (izole kurulumda para birimi ayarı zaten kurulum başınadır); R2 kendi önceliğiyle yürür.
Panel düzeni (R3) ve Almanca website (R4) bağımsızdır ve paralel yürüyebilir.

| # | İş | Bağımlılık | Tahmini boyut | Risk |
|---|----|-----------|---------------|------|
| R1 | Hibrit çoklu müşteri: yönetim katmanı + müşteri başına veritabanı + izole kurulum, 4 aşama (ADR 0001) | — | Çok büyük (Aşama 1: 6–8 PR; Aşama 2–3 platform işi) | Aşama 1 düşük; Aşama 2–3 orta-yüksek (sızıntı riski CI kapısıyla) |
| R2 | Çoklu para birimi | — | Büyük (4 PR) | Orta: GoBD/DATEV uyumu |
| R3 | Panel kartlarını sürükle/boyutlandır | — | Orta (2–3 PR) | Düşük |
| R4 | Almanca website dokümantasyonu | — | Orta (2 PR + sürekli) | Düşük |

---

## R1 — Hibrit çoklu müşteri (yönetim katmanı + müşteri başına veritabanı + izole kurulum)

Karar: [ADR 0001](./adr/0001-isolated-deployment-per-customer.md) (hibrit, aşamalı). Tek kod tabanı; SaaS ve self-host eşit önemde. Paketler: Community, Business, Enterprise (+ self-host). Ortak veritabanlı çok kiracılık (`organizationId` + RLS) ana ürüne **eklenmez**.

**Aşama 1 — Yönetim katmanı + izole kurulum (modül kodu değişmez)**
- **R1.1 Müşteri açma:** Tek komutla Postgres veritabanı ve kullanıcı, müşteri başına secret'lar (`AUTH_SECRET`, `DATA_ENCRYPTION_*`, `MAIL_ENCRYPTION_KEY`), dosya deposu, alan adı ve TLS, web + worker konteyneri, migrator, ilk yönetici daveti. Hedef ortam: Coolify veya eşdeğeri.
- **R1.2 Aşamalı yayın:** Sürüm kanalları (test grubu → genel), müşteri başına sürüm sabitleme, geriye uyumlu migration kuralı, otomatik geri alma.
- **R1.3 Yedek ve geri yükleme:** Müşteri anahtarıyla şifreli günlük yedek (bekleyen "şifreli yedek" işiyle birleşir), geri yükleme provası, istekle dışa aktarma ve silme.
- **R1.4 İzleme ve maliyet:** Sağlık uçları, kuyruk, disk ve migration durumu; kişisel veri içermeyen merkezi log/metrik; uyuyan konteyner ve kaynak profilleri.
- **R1.5 Plan ve fatura:** Paket → modül seti ve limitler. Yönetim katmanı yalnız işletme verisi tutar. AVV/DPA ve alt işleyen listesi.
- **R1.6 Self-host paketi:** Aynı imajlarla `docker compose`, güncelleme rehberi.
- **R1.7 Kapı:** İki kurulumun ağ, veritabanı, dosya ve anahtar düzeyinde birbirine erişemediğinin otomatik testi; geri yükleme ve geri alma provası.

**Aşama 2 — Müşteri bağlamı sözleşmesi**
- **R1.8 Envanter (ADR 0003):** Süreç düzeyinde tek olan her şey: veritabanı istemcisi, anahtarlar, pg-boss, dosya kökü, mail ayarları, AI bütçe/takma ad, önbellekler, zamanlayıcılar.
- **R1.9 Sözleşme:** Doğrulanmış bağlamdan müşteri çözümü; imzalı iş zarfı; modüller yalnız platform sözleşmesinden erişir (lint/test ile zorunlu).
- **R1.10 Kapı:** Tek süreçte iki test müşterisiyle tüm test paketi ve çapraz erişim testleri CI'da.

**Aşama 3 — Ortak çalışma zamanı + müşteri başına veritabanı**
- **R1.11** Community ve küçük Business müşterileri ortak runtime'a; yalnız onaylı modüller (üçüncü taraf modüller ayrılmış kurulumda).
- **R1.12** Sınırlı istemci önbelleği, bağlantı havuzu, müşteri bazında migration takibi ve kota (ADR 0004).
- **R1.13** Maliyet ölçümü; Community ekonomisi tutmuyorsa ayrı ADR.

**Aşama 4 — Merkezi kimlik ve paket geçişleri**
- **R1.14** Yönetim katmanında SSO; bir kullanıcı birden fazla kurumda (yetkiler kurumda kalır).
- **R1.15** Community → Business → Enterprise geçişinde veri taşıma; kod değişmez.

Kabul (genel): Yeni müşteri tek komutla açılır, güncellenir, yedeklenir ve silinir. Hiçbir müşteri başka müşterinin verisine, dosyasına veya anahtarına erişemez. Yeni modüller müşteri mantığı yazmaz.

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
