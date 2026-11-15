---
sidebar_position: 8
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
| Sürüm | 1.0.2 |
| Sayfalar | `/ayarlar/dernek` |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Dernek Ana Bilgileri | görüntüleme, düzenleme | görüntüleme, düzenleme | görüntüleme | görüntüleme | görüntüleme | — | — |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_organization_info`

## Sürüm notları

### 1.0.2 — Asistan araçları yeni veri sözleşmesinde

_2026-11-15_

- **Güvenlik:** Asistan araçları v2 veri sözleşmesine taşındı: modele giden her alan açıkça listelenir ve veri sınıfı bildirilir. Toplam ve kurumsal veriler denetimli bulut modunda da kullanılabilir; serbest kişisel içerik yalnız yerel modelde kalır.

### 1.0.1 — Worker girişi

_2026-11-07_

- **İyileştirme:** Arka plan görevleri için kurum profili ve logo okuma girişi (antetli PDF'ler).

### 1.0.0 — İlk sürüm

_2026-10-29_

- **Yeni:** İlk sürüm.
