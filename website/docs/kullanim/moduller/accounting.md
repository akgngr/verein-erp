---
sidebar_position: 27
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
| Sürüm | 1.25.0 |
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

### 1.25.0 — Sekreterden ihtar önerisi

_2026-11-19_

- **Yeni:** Vadesi geçmiş ve ihtar zamanı gelmiş faturalar için sekreter, onay kutusunda "ihtar kaydı oluştur" önerisi sunar. Onaylanınca her faturaya sıradaki ihtar kademesi kaydedilir; e-posta veya PDF gönderilmez. Yalnız muhasebe düzenleme yetkisi olanlar görür; bu arada ödenen veya ihtarlanan fatura varsa öneri geçersiz olur.

### 1.24.2 — Kod bakımı

_2026-11-19_

- **İyileştirme:** Kullanılmayan kod temizlendi; formlar alan değişikliklerini React Compiler ile uyumlu şekilde izliyor. Görünüm ve davranış değişmedi.

### 1.24.1 — Arayüz altyapısı

_2026-11-18_

- **İyileştirme:** Düğme ve bağlantılar ortak arayüz kitine taşındı. Görünüm ve davranış değişmedi.

### 1.24.0 — Sekreter özetine katkı

_2026-11-18_

- **Yeni:** Kişisel sekreterin sabah özetinde vadesi geçmiş faturalar, kontrol bekleyen gelen faturalar, eşleşmemiş banka hareketleri ve yaklaşan vergi tarihi görünür (yalnız sayı ve toplam, cari adı yok).

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

Daha eski 45 herkese açık sürüm notu.
