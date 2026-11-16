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
| Sürüm | 1.22.6 |
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

### 1.22.3 — Kasa defteri tarih ve bakiye doğruluğu

_2026-11-16_

- **Düzeltme:** Kasa defterinde bitiş gününün tamamı hesaba katılır; iptal satırları sıralandıktan sonra yürüyen bakiyeler yeniden hesaplanır ve yıl sonu bakiye kesimi düzeltilir.

### 1.22.2 — Geçmiş gelir-gider raporlarında pasif kategoriler

_2026-11-16_

- **Düzeltme:** Pasifleştirilmiş kategorilerde geçmiş fişler varsa gelir-gider raporundan kaybolmaları önlendi. Boş kategoriler yine listelenmez.

### 1.22.1 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 1.22.0 — Asistan: gelir-gider özetleri bulutta da

_2026-11-15_

- **Yeni:** Asistanın muhasebe araçları (gelir-gider, KDV, açık kalemler, banka, gelen faturalar, rapor bağlantısı) yeni veri sözleşmesine taşındı: yalnız toplamlar, kişi/karşı taraf yok. Denetimli bulut modunda da çalışırlar.

### 1.21.1 — Evrak aktarımı için sunucu API'si

_2026-11-15_

- **Güvenlik:** Gelen fatura taslağı içe aktarımı ve izin tanımı diğer modüllerin onaylı erişimine açıldı.

Daha eski 25 sürüm: [releases.json](https://github.com/akgngr/verein-erp/blob/main/src/modules/accounting/releases.json)
