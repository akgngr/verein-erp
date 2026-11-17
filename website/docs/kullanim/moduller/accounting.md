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
| Sürüm | 1.23.0 |
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

### 1.23.0 — Canlı finansal genel bakış

_2026-11-17_

- **Yeni:** Genel bakış yeniden tasarlandı: toplam likidite ve 30 günlük bakiye tahmini, önceki yıla göre değişimli KPI kartları, aylık nakit akışı grafiği, gider dağılımı ve yaklaşan tahsilat/ödeme/vergi zaman çizelgesi.
- **Yeni:** Sağ sütunda AI durum analizi kartı (yapay zekâ modülü etkinse) ve dikkat gerektiren işler listesi; vadesi geçmiş ve onay bekleyen gelen faturalar eklendi.
- **Düzeltme:** Menüde iki "Genel bakış" görünmesi düzeltildi; fiş listesi artık "Fişler" adıyla ayrı.

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

### 1.22.10 — Vadesi geçmiş fatura özeti performansı

_2026-11-16_

- **İyileştirme:** Muhasebe paneli vadesi geçmiş faturaların tamamını tek seferde belleğe almak yerine 250 kayıtlık sayfalarda işler; fatura başına açık tutar ve Skonto semantiği korunur.

### 1.22.9 — ACC-9 KPI mutabakatı

_2026-11-16_

- **Düzeltme:** Gelir-gider raporu tüm iptal edilmemiş ve virman olmayan fişlerin brüt toplamını ayrıca taşır; kategorisiz fişler mutabakat farkı olarak görünür ve dashboard ile rapor toplamları aynı kapsamda açıklanabilir.
- **İyileştirme:** Muhasebe AI özeti brüt gelir, gider, fark ve kategorisiz tutarları açıkça döndürür; kategori satırlarıyla genel toplam arasındaki fark saklanmaz.

### 1.22.8 — Premium muhasebe kartları ve hafif grafik

_2026-11-16_

- **İyileştirme:** Muhasebe panelindeki özet kartlar daha şık ve duyarlı bir tasarıma geçirildi. Çeyreklik gelir-gider grafiği hafif, sunucuda çizilen SVG sütunlarla yenilendi; erişilebilir veri tablosu korundu.
- **İyileştirme:** Yeni grafik kütüphanesi veya istemci JavaScript yükü eklenmedi; mevcut tema değişkenleri ve muhasebe hesaplamaları kullanılmaya devam eder.

### 1.22.7 — Banka mutabakatı kontrol önerisi

_2026-11-16_

- **Yeni:** Muhasebe genel bakış ekranında açık durumdaki eşleştirilmemiş banka hareketleri sayılır; banka ekranına güvenli yönlendirme yapılır ve otomatik işlem başlatılmaz.

Daha eski 33 sürüm: [releases.json](https://github.com/akgngr/verein-erp/blob/main/src/modules/accounting/releases.json)
