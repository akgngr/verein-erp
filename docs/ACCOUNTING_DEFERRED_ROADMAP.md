# Muhasebe — ertelenen işler yol haritası

**Durum:** Plan (uygulanmadı) · **Tarih:** 2026-11-17
**Kaynak:** [ACC-9 uygulama durumu](./ACC9_IMPLEMENTATION_STATUS.md) içinde "kapsam dışı" bırakılan dört başlık.

Sıralama bağımlılığa göredir: çoklu kurum (R1), çoklu para biriminden (R2) önce gelir, çünkü para birimi ayarı kuruma bağlıdır.
Panel düzeni (R3) ve Almanca website (R4) bağımsızdır ve paralel yürüyebilir.

| # | İş | Bağımlılık | Tahmini boyut | Risk |
|---|----|-----------|---------------|------|
| R1 | Çoklu kurum (multi-tenant) | — | Çok büyük (6+ PR) | Yüksek: veri sızıntısı |
| R2 | Çoklu para birimi | R1 (kurum para birimi) | Büyük (4 PR) | Orta: GoBD/DATEV uyumu |
| R3 | Panel kartlarını sürükle/boyutlandır | — | Orta (2–3 PR) | Düşük |
| R4 | Almanca website dokümantasyonu | — | Orta (2 PR + sürekli) | Düşük |

---

## R1 — Çoklu kurum (SaaS multi-tenancy)

Hedef: tek kurulumda birden çok derneğin/işletmenin verisi, birbirinden kesin yalıtılmış olarak çalışsın.

- **R1.0 Karar (ADR):** satır düzeyi `organizationId` + PostgreSQL RLS ile şema-başına-kurum karşılaştırması.
  Öneri: `organizationId` + RLS (tek migration hattı, pg-boss ile uyumlu).
- **R1.1 Veri modeli:** tüm modül tablolarına `organizationId` (NOT NULL, indeksli); mevcut veri tek kuruma taşınır; geri dönüş betiği.
- **R1.2 İstek bağlamı:** oturumdan kurum çözümü, `getDb()` her sorguda kurum filtresi (Prisma extension) ve RLS `SET app.org_id`.
- **R1.3 Arka plan işleri:** pg-boss işlerine `organizationId` zorunlu; GoBD hash zinciri ve numara serileri kurum başına.
- **R1.4 Dosyalar ve önbellek:** dosya depolama yolu, geçici yüklemeler, AI takma ad ve önbellek anahtarları kurum önekli.
- **R1.5 Yönetim:** kurum oluşturma/davet, kullanıcı birden çok kuruma üye, kurum değiştirici.
- **R1.6 Testler (zorunlu kapı):** çapraz kurum erişim testi (her API rotası, kart, dışa aktarma, AI aracı), RLS kapalıyken bile filtre testi.

Kabul: başka kurumun kimliğiyle yapılan hiçbir istek veri döndürmez; tüm modüller kurum filtresini otomatik alır (modül yazarı unutamaz).

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
