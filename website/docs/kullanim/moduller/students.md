---
sidebar_position: 31
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
| Sürüm | 1.4.15 |
| Sayfalar | `/ogrenciler`, `/ogrenciler/veliler`, `/ogrenciler/ayarlar` |
| Önerir | [e-Sign](./online-forms) |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [e-Sign](./online-forms) | okuma | Öğrenci ve veli sayfalarından e-imza/uzaktan form bağlantısı göndermek ve imzalı belgeleri göstermek için. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| DATEV aktarımı | görüntüleme, düzenleme | görüntüleme | — | görüntüleme, düzenleme | görüntüleme | — | — | — |
| Öğrenciler | görüntüleme, oluşturma, düzenleme, silme | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme | görüntüleme | — | — | — |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_student_statistics`

## Sürüm notları

### 1.4.15 — Kurs veli alıcıları için veli iletişim sözleşmesi (#631)

_2026-11-28_

- **Yeni:** Öğrenci listesi üzerinden veli iletişim ve izin bilgilerini döndüren listGuardianContactsForStudents sunucu sözleşmesi eklendi.

### 1.4.14 — Veli self-servis silinmiş kayıt filtresi ve denetim kaydı gizliliği

_2026-11-25_

- **Güvenlik:** Veli self-servis ve yetki sorgularında silinmiş kayıtlar (deletedAt) filtrelendi; SELF_PAYER denetim kaydından ad-soyad kişisel verisi kaldırıldı (#579).

### 1.4.13 — nav.json kategori ve alt modül tanımı

_2026-11-24_

- **İyileştirme:** Kullanıcı bazlı sol menü gruplama ve alt modül hiyerarşisi için nav.json eklendi.

### 1.4.12 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 1.4.10 — Arayüz altyapısı

_2026-11-18_

- **İyileştirme:** Düğme ve bağlantılar ortak arayüz kitine taşındı. Görünüm ve davranış değişmedi.

### 1.4.8 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

### 1.4.7 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 1.4.6 — Uzaktan form bağı bildirildi

_2026-11-15_

- **Güvenlik:** Öğrenci ve veli sayfalarındaki e-imza bağlantıları artık bildirilmiş erişimle çalışır. Yönetici erişimi bir kez onaylar.

Daha eski 11 herkese açık sürüm notu.
