---
sidebar_position: 23
title: "Muhasebe"
description: "Dernekler ve küçük işletmeler için EÜR odaklı gelir-gider, fiş, fatura ve bütçe yönetimi."
slug: /kullanim/moduller/accounting
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Dernekler ve küçük işletmeler için EÜR odaklı gelir-gider, fiş, fatura ve bütçe yönetimi.

| | |
|---|---|
| Anahtar | `accounting` |
| Tür | Resmî modül |
| Sürüm | 1.23.7 |
| Sayfalar | `/muhasebe`, `/muhasebe/panel`, `/muhasebe/faturalar`, `/muhasebe/gelen-faturalar`, `/muhasebe/cariler`, `/muhasebe/banka`, `/muhasebe/uyelik-aktarimi`, `/muhasebe/raporlar`, `/muhasebe/vergi`, `/muhasebe/hibeler`, `/muhasebe/sepa`, `/muhasebe/butce`, `/muhasebe/ekler`, `/muhasebe/gobd`, `/muhasebe/yil-kapanisi`, `/muhasebe/ayarlar` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Modül Yönetimi](./system) | okuma | Envanter modülünün etkin olup olmadığını okur. |
| [Envanter ve Demirbaş](./inventory) | yazma | Demirbaşları envanter eşyalarıyla senkron tutar (ad, tarih, bedel, hurdaya çıkarma). |
| [Üyeler](./members) | okuma | Üye aidat ödemelerini muhasebeye aktarmak için ödemeleri okur. |
| [Dernek Bilgileri](./organization) | okuma | PDF raporlarında dernek antetini kullanır. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Yevmiye & Defterler | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme | — | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme | — | — |
| Hesap Planı & Bütçe | görüntüleme, oluşturma, düzenleme | görüntüleme | — | görüntüleme, oluşturma, düzenleme | görüntüleme | — | — |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_accounting_summary` · `get_bank_inbox_summary` · `get_open_items_summary` · `get_payables_summary` · `get_report_link` · `get_vat_summary`

## Sürüm notları

### 1.23.7 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

### 1.23.6 — Ortak UI kartları

_2026-11-17_

- **İyileştirme:** Genel bakış paneli ortak SurfaceCard bileşenini kullanıyor (görünüm aynı).

### 1.23.5 — Gelen fatura ve fiş detay eylemleri ortak UI katmanında

_2026-11-17_

- **İyileştirme:** Gelen fatura yükleme ile fiş detay düzenle/storno eylemleri ortak ActionButton/LinkButton/notify pattern'lerine taşındı; bu dosyalardaki doğrudan HeroUI bağımlılığı kaldırıldı.

### 1.23.4 — Muhasebe eylemleri ortak UI adapterında

_2026-11-17_

- **İyileştirme:** İhtar oluşturma, XRechnung/ZUGFeRD indirme ve banka kuralı silme eylemleri ortak ActionButton/notify katmanına taşındı; bu dosyalardaki doğrudan HeroUI bağımlılığı kaldırıldı.

### 1.23.3 — ELSTER hazırlığı (UStVA, doğrulama)

_2026-11-17_

- **İyileştirme:** UStVA verisini ELSTER XML'ine çeviren ve vergi numarasını 13 haneli ELSTER formatına dönüştüren servisler eklendi; ERiC ile yalnız doğrulama yapan CI işi hazır. Uygulamada henüz gönderim veya indirme yoktur.

### 1.23.2 — E-fatura uygunluk düzeltmesi (BR-CO-26)

_2026-11-17_

- **Düzeltme:** USt-IdNr. olmayan satıcılarda (ör. §19 kapsamındaki dernekler) XRechnung/ZUGFeRD çıktısı EN 16931 BR-CO-26 kuralına göre geçersizdi. Kurum profilindeki sicil numarası artık satıcının yasal kayıt numarası (BT-30) olarak eklenir; ikisi de yoksa dışa aktarma öncesi açık bir hata gösterilir.
- **İyileştirme:** Giden e-faturalar CI'da Mustang (EN 16931, XRechnung, Factur-X, veraPDF PDF/A-3) ve resmî KoSIT doğrulayıcısı ile sentetik örneklerle düzenli olarak doğrulanır.

### 1.23.1 — Muhasebe istatistik kartları ortak UI katmanında

_2026-11-17_

- **İyileştirme:** Kart ve yüzey görünümleri ortak SurfaceCard/StatCard pattern'ine taşındı; modül bu kullanımda HeroUI Card implementasyonuna doğrudan bağlı değil.

### 1.23.0 — Canlı finansal genel bakış

_2026-11-17_

- **Yeni:** Genel bakış yeniden tasarlandı: toplam likidite ve 30 günlük bakiye tahmini, önceki yıla göre değişimli KPI kartları, aylık nakit akışı grafiği, gider dağılımı ve yaklaşan tahsilat/ödeme/vergi zaman çizelgesi.
- **Yeni:** Sağ sütunda AI durum analizi kartı (yapay zekâ modülü etkinse) ve dikkat gerektiren işler listesi; vadesi geçmiş ve onay bekleyen gelen faturalar eklendi.
- **Düzeltme:** Menüde iki "Genel bakış" görünmesi düzeltildi; fiş listesi artık "Fişler" adıyla ayrı.

Daha eski 41 herkese açık sürüm notu.
