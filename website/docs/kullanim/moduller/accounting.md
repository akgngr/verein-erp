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
| Sürüm | 1.26.1 |
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

### 1.26.1 — GoBD silme koruması

_2026-11-23_

- **Güvenlik:** Banka ekstresi hareketleri ilişkisi (AccountingBankTransaction.import) onDelete: Restrict olarak güncellendi.

### 1.26.0 — Genel Kurul Kassenbericht ve sunum görünümü

_2026-11-22_

- **Yeni:** Genel Kurul için tek tıkla faaliyet alanları (§ 5), projeler, rezervler ve önceki yıl karşılaştırmalı Kassenbericht PDF raporu ve slayt görünümü eklendi (Q3, Refs #407).

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

Daha eski 47 herkese açık sürüm notu.
