---
sidebar_position: 10
title: "Dernek Bilgileri"
description: "Dernek ana verileri, resmi iletişim ve antet logosu."
slug: /kullanim/moduller/organization
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Dernek ana verileri, resmi iletişim ve antet logosu.

| | |
|---|---|
| Anahtar | `organization` |
| Tür | Çekirdek (her zaman açık) |
| Sürüm | 1.0.11 |
| Sayfalar | `/ayarlar/dernek` |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Dernek Ana Bilgileri | görüntüleme, düzenleme | görüntüleme, düzenleme | görüntüleme | görüntüleme | görüntüleme | — | — | — |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_organization_info`

## Sürüm notları

### 1.0.11 — Ayar merkezi grubu

_2026-11-26_

- **İyileştirme:** Ayar sayfaları ayar merkezinde kendi grubunda ve sırasında gösterilir.

### 1.0.10 — Arayüz düzeltmeleri (#586)

_2026-11-25_

- **Düzeltme:** Kamu yararı bölüm başlığı Türkçe arayüzde büyük harfe çevrilmez ("GEMEİNNÜTZİGKEİT" hatası).

### 1.0.9 — Profil kaydı ve görünüm

_2026-11-25_

- **Düzeltme:** Profil art arda kaydedilebilir ve logo değişikliğinden sonra 'kayıt değişti' hatası vermez; son düzenleyen her kayıtta güncellenir.
- **İyileştirme:** Salt okunur görünüm Gemeinnützigkeit alanlarını (belge türü, amaçlar, aidat indirilebilirliği) gösterir.

### 1.0.8 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 1.0.5 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

### 1.0.4 — Logo yüzeyi ortak UI katmanında

_2026-11-17_

- **İyileştirme:** Logo yükleme kartı, eylem butonları ve bildirimleri ortak SurfaceCard, ActionButton ve notify adapter katmanına taşındı.

### 1.0.3 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 1.0.2 — Asistan araçları yeni veri sözleşmesinde

_2026-11-15_

- **Güvenlik:** Asistan araçları v2 veri sözleşmesine taşındı: modele giden her alan açıkça listelenir ve veri sınıfı bildirilir. Toplam ve kurumsal veriler denetimli bulut modunda da kullanılabilir; serbest kişisel içerik yalnız yerel modelde kalır.

Daha eski 2 herkese açık sürüm notu.
