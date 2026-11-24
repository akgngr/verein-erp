---
sidebar_position: 6
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
| Sürüm | 1.0.10 |
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

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| CRM | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme, oluşturma, düzenleme, silme | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme | — | — | görüntüleme |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_crm_pipeline`

## Sürüm notları

### 1.0.10 — nav.json kategori ve alt modül tanımı

_2026-11-24_

- **İyileştirme:** Kullanıcı bazlı sol menü gruplama ve alt modül hiyerarşisi için nav.json eklendi.

### 1.0.9 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 1.0.8 — Arayüz altyapısı

_2026-11-18_

- **İyileştirme:** Düğme ve bağlantılar ortak arayüz kitine taşındı. Görünüm ve davranış değişmedi.

### 1.0.6 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

### 1.0.5 — Mobilde alttan açılan çekmece

_2026-11-16_

- **İyileştirme:** Form/ayrıntı çekmecesi mobilde alttan açılır (masaüstünde sağdan).

### 1.0.4 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 1.0.3 — Asistan araçları yeni veri sözleşmesinde

_2026-11-15_

- **Güvenlik:** Asistan araçları v2 veri sözleşmesine taşındı: modele giden her alan açıkça listelenir ve veri sınıfı bildirilir. Toplam ve kurumsal veriler denetimli bulut modunda da kullanılabilir; serbest kişisel içerik yalnız yerel modelde kalır.

### 1.0.2 — Sürümlü AI istatistik sözleşmesi

_2026-11-15_

- **Güvenlik:** Toplu istatistik araçları katı girdi, sunucu sonucu ve modele çıkacak alanların açık şemalarıyla v2 sözleşmesine taşındı; kişisel satırlar modele döndürülmez.

Daha eski 2 herkese açık sürüm notu.
