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
| Sürüm | 1.23.3 |
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

### 1.22.14 — Yıl kapanışı eylemleri ortak buton katmanında

_2026-11-17_

- **İyileştirme:** Buton görünümü ve etkileşim semantiği ortak ActionButton pattern'ine taşındı; modül bu kullanımda HeroUI Button implementasyonuna doğrudan bağlı değil.

### 1.22.13 — Muhasebe rozetleri ortak UI katmanında

_2026-11-17_

- **İyileştirme:** Rozet/çip görünümleri ortak StatusChip pattern'ine taşındı; modül düzeyindeki doğrudan HeroUI Chip bağımlılığı azaltıldı.

### 1.22.12 — Fiş türü rozeti ortak UI katmanında

_2026-11-17_

- **İyileştirme:** Rozet görünümü ortak StatusChip pattern'ine taşındı; modül artık bu kullanımda HeroUI Chip implementasyonuna doğrudan bağlı değil.

### 1.22.11 — Yaklaşan vergi tarihi kontrol önerisi

_2026-11-16_

- **Yeni:** Muhasebe paneli mevcut vergi ayarlarından 60 gün içindeki yaklaşan UStVA/yıllık beyan tarihini salt okunur öneri olarak gösterir; otomatik beyan veya işlem başlatılmaz.
- **İyileştirme:** Uyarı resmi tatiller ve özel süre uzatmalarının mevcut takvim hesabında yer almadığını açıkça belirtir.

Daha eski 37 sürüm: [releases.json](https://github.com/akgngr/verein-erp/blob/main/src/modules/accounting/releases.json)
