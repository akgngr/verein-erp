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
| Sürüm | 1.4.6 |
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

### 1.4.0 — Online form: öğrenci/veli bilgilerini tamamlama ve imza; reşit olmayan öğrencide veli onayı

_2026-11-07_

- **Yeni:** Online form: öğrenci/veli bilgilerini tamamlama ve imza; reşit olmayan öğrencide veli onayı

### 1.3.0 — Veli adresi: Bundesland seçimi ve ülke listesi

_2026-11-07_

- **İyileştirme:** Veli adresi: Bundesland seçimi ve ülke listesi

Daha eski 4 sürüm: [releases.json](https://github.com/akgngr/verein-erp/blob/main/src/modules/students/releases.json)
