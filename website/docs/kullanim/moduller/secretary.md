---
sidebar_position: 29
title: "Sekreter"
description: "Kişisel sekreter: sabah özeti ve onaylı öneriler."
slug: /kullanim/moduller/secretary
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Kişisel sekreter: sabah özeti ve onaylı öneriler.

| | |
|---|---|
| Anahtar | `secretary` |
| Tür | Eklenti |
| Sürüm | 0.4.0 |
| Sayfalar | `/sekreter` |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Sekreter | görüntüleme, düzenleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | — |

## Sürüm notları

### 0.4.0 — Özet öğelerini kapatma ve erteleme

_2026-11-18_

- **Yeni:** Sabah özetindeki bir öğe kapatılabilir, en fazla 90 gün ertelenebilir veya yeniden gösterilebilir. Bu yalnız sizin görünümünüzü değiştirir; kaynak kayıt değişmez.

### 0.3.0 — Sabah özeti toplayıcısı

_2026-11-18_

- **Yeni:** Modüllerin sekretere verdiği katkılar tek bir özette toplanır. Yalnız yetkili olunan ve açık modüller görünür; hata veren veya yavaş bir modül özeti durdurmaz. Kapatılan ve ertelenen öğeler gizlenir.

### 0.2.0 — Sekreter veri modeli

_2026-11-18_

- **Yeni:** Sekreter tercihleri, özet öğelerini kapatma/erteleme durumu ve öneriler için tablolar eklendi. Kullanıcı silindiğinde bu kayıtlar da silinir.

### 0.1.0 — Sekreter modülü iskeleti

_2026-11-18_

- **Yeni:** Kişisel sekreter modülü eklendi (varsayılan kapalı). Sabah özeti ve öneriler sonraki sürümlerde gelecek.
