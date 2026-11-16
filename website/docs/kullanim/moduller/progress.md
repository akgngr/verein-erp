---
sidebar_position: 26
title: "Öğrenci takibi"
description: "Kurs öğrencilerinin yoklaması, sınav ve notları, gelişim notları ve veli raporu."
slug: /kullanim/moduller/progress
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Kurs öğrencilerinin yoklaması, sınav ve notları, gelişim notları ve veli raporu.

| | |
|---|---|
| Anahtar | `progress` |
| Tür | Resmî modül |
| Sürüm | 1.1.1 |
| Sayfalar | `/ogrenci-takibi` |
| Gerektirir | [Kurslar](./courses) |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Kurslar](./courses) | okuma | Yoklama ve notlar için kursları, dersleri ve kayıtlı öğrencileri okur. |
| [Dernek Bilgileri](./organization) | okuma | Veli raporunda dernek antetini kullanır. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Tüm gelişim notları | silme | — | — | — | — | — | — |
| Öğrenci takibi | görüntüleme, oluşturma, düzenleme, silme | görüntüleme | görüntüleme, oluşturma, düzenleme | — | — | görüntüleme, oluşturma, düzenleme, silme | — |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_progress_statistics`

## Sürüm notları

### 1.1.1 — AI veri sözleşmesi ve liste güvenilirliği

_2026-11-15_

- **İyileştirme:** AI çıktısı açık şema veya sayfalama metadatasıyla sınırlandırılır; kişi alanları eklenmez.

### 1.1.0 — Bağımlılık

_2026-11-01_

- **İyileştirme:** Zorunlu: Kurslar.

### 1.0.1 — Menü: Kurslar altında

_2026-11-01_

- **İyileştirme:** Öğrenci takibi ana menüde değil, Kurslar menüsünde.

### 1.0.0 — Kurslar, öğrenciler ve öğrenci takibi

_2026-10-30_

- **Yeni:** Kurs ve özel ders yönetimi, öğretmen rolü, ücretler ve muhasebe aktarımı.
- **Yeni:** Öğrenci ve veli kayıtları (DATEV uyumlu); devam, not ve değerlendirme takibi.
