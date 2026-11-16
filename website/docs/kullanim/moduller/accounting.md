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
| Sürüm | 1.22.11 |
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

### 1.22.11 — Yaklaşan vergi tarihi kontrol önerisi

_2026-11-16_

- **Yeni:** Muhasebe paneli mevcut vergi ayarlarından 45 gün içindeki yaklaşan UStVA/yıllık beyan tarihini salt okunur öneri olarak gösterir; otomatik beyan veya işlem başlatılmaz.
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

### 1.22.6 — ACC-9 hesaplama doğruluğu ve muhasebe kapsamı

_2026-11-16_

- **Düzeltme:** Dashboard için ay/çeyrek dönemleri ve fatura bazında açık borç toplamları regresyon testleriyle güvenceye alındı.
- **İyileştirme:** Modül tanımı mevcut EÜR odaklı muhasebe kapsamına uygun hale getirildi; tam HGB çift taraflı bilanço desteği iddia edilmez.

### 1.22.5 — Muhasebe genel bakış ekranı

_2026-11-16_

- **Yeni:** Muhasebe modülüne dönem seçimi, çeyreklik SVG/CSS gelir-gider çubukları ve erişilebilir tabloyla salt okunur genel bakış eklendi; gecikmiş faturalar ve belgesiz fişler için kontrol önerileri sunulur.
- **İyileştirme:** Gelir-gider fiş toplamları mevcut muhasebe listesi ve genel bakış tarafından ortak sorgudan üretilir.

### 1.22.4 — Ana panel muhasebe kartları

_2026-11-16_

- **Yeni:** Mevcut fiş istatistiklerini kullanan gelir, gider, fiş farkı ve eksik belge kartları ana panelde seçilebilir. Kartlar kullanıcı rolüne göre filtrelenir; yeni grafik paketi eklenmedi.

Daha eski 30 sürüm: [releases.json](https://github.com/akgngr/verein-erp/blob/main/src/modules/accounting/releases.json)
