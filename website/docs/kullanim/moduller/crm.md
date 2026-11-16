---
sidebar_position: 5
title: "CRM"
description: "Kişiler ve kurumlarla ilişki yönetimi: aşamalar, fırsatlar, zaman akışı ve takipler."
slug: /kullanim/moduller/crm
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Kişiler ve kurumlarla ilişki yönetimi: aşamalar, fırsatlar, zaman akışı ve takipler.

| | |
|---|---|
| Anahtar | `crm` |
| Tür | Resmî modül |
| Sürüm | 1.0.4 |
| Sayfalar | `/crm` |
| Önerir | [Üyeler](./members), [Muhasebe](./accounting) |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Üyeler](./members) | okuma | CRM kişilerinin adını ve iletişim bilgisini üye kaydından okur (kopyalamaz). |
| [Muhasebe](./accounting) | okuma | Cari hesap adını ve iletişim bilgisini muhasebeden okur (kopyalamaz). |
| [Modül Yönetimi](./system) | okuma | Hangi kaynak modüllerin açık olduğunu kontrol eder. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| CRM | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme, oluşturma, düzenleme, silme | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme | — | görüntüleme |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_crm_pipeline`

## Sürüm notları

### 1.0.4 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 1.0.3 — Asistan araçları yeni veri sözleşmesinde

_2026-11-15_

- **Güvenlik:** Asistan araçları v2 veri sözleşmesine taşındı: modele giden her alan açıkça listelenir ve veri sınıfı bildirilir. Toplam ve kurumsal veriler denetimli bulut modunda da kullanılabilir; serbest kişisel içerik yalnız yerel modelde kalır.

### 1.0.2 — Sürümlü AI istatistik sözleşmesi

_2026-11-15_

- **Güvenlik:** Toplu istatistik araçları katı girdi, sunucu sonucu ve modele çıkacak alanların açık şemalarıyla v2 sözleşmesine taşındı; kişisel satırlar modele döndürülmez.

### 1.0.1 — Seçim kutularında hydration uyarısı giderildi

_2026-11-07_

- **Düzeltme:** Seçim kutularında hydration uyarısı giderildi

### 1.0.0 — İlk sürüm

_2026-11-07_

- **Yeni:** Üyeler ve cari hesaplar üzerinde ilişki yönetimi: aşamalar, etiketler, fırsat panosu, zaman akışı, takipler (takvimde), iş akışı olayı ve AI için toplu fırsat sayıları.
