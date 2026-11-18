---
sidebar_position: 27
title: "Öğrenciler"
description: "Kurs ve Nachhilfe öğrencileri, veliler ve DATEV uyumlu borçlu (Debitor) kayıtları."
slug: /kullanim/moduller/students
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Kurs ve Nachhilfe öğrencileri, veliler ve DATEV uyumlu borçlu (Debitor) kayıtları.

| | |
|---|---|
| Anahtar | `students` |
| Tür | Resmî modül |
| Sürüm | 1.4.8 |
| Sayfalar | `/ogrenciler`, `/ogrenciler/veliler`, `/ogrenciler/ayarlar` |
| Önerir | [e-Sign](./online-forms) |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [e-Sign](./online-forms) | okuma | Öğrenci ve veli sayfalarından e-imza/uzaktan form bağlantısı göndermek ve imzalı belgeleri göstermek için. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| DATEV aktarımı | görüntüleme, düzenleme | görüntüleme | — | görüntüleme, düzenleme | görüntüleme | — | — |
| Öğrenciler | görüntüleme, oluşturma, düzenleme, silme | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme | görüntüleme | — | — |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_student_statistics`

## Sürüm notları

### 1.4.8 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

### 1.4.7 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 1.4.6 — Uzaktan form bağı bildirildi

_2026-11-15_

- **Güvenlik:** Öğrenci ve veli sayfalarındaki e-imza bağlantıları artık bildirilmiş erişimle çalışır. Yönetici erişimi bir kez onaylar.

### 1.4.5 — AI takma ad çözümlemesi

_2026-11-15_

- **İyileştirme:** AI asistanı için canlı öğrenci ve veli adı sorgusu eklendi (yalnız AI modülünün sunucu tarafı kullanır).

### 1.4.4 — Açık kimlik bağlantıları

_2026-11-15_

- **Güvenlik:** AI kişi eşleştirmesi yalnız mevcut açık kayıt bağlantılarını kullanır; ad/e-posta tahmini ve veli-çocuk kimlik birleştirmesi reddedilir.

### 1.4.3 — AI veri sözleşmesi ve liste güvenilirliği

_2026-11-15_

- **İyileştirme:** AI çıktısı açık şema veya sayfalama metadatasıyla sınırlandırılır; kişi alanları eklenmez.

### 1.4.2 — SEPA modülü için veli yetki bilgisi (yalnız okuma)

_2026-11-07_

- **İyileştirme:** SEPA modülü için veli yetki bilgisi (yalnız okuma)

### 1.4.1 — Öğrenci sayfasında e-Sign belgelerine bağlantı; veli listesinden e-Sign formu gönderme

_2026-11-07_

- **İyileştirme:** Öğrenci sayfasında e-Sign belgelerine bağlantı; veli listesinden e-Sign formu gönderme

Daha eski 6 herkese açık sürüm notu.
