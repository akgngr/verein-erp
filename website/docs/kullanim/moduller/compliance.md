---
sidebar_position: 40
title: "Uyum kontrolü"
description: "Kamu yararı (Gemeinnützigkeit) için iç kontrol listesi: süreler ve sınırlar. Vergi danışmanlığı değildir."
slug: /kullanim/moduller/compliance
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Kamu yararı (Gemeinnützigkeit) için iç kontrol listesi: süreler ve sınırlar. Vergi danışmanlığı değildir.

| | |
|---|---|
| Anahtar | `compliance` |
| Tür | Eklenti |
| Sürüm | 0.1.0 |
| Sayfalar | `/compliance` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Modül Yönetimi](./system) | okuma | Kural kaynağı olan modül açık mı, kontrol edilir. |
| [Görevler](./tasks) | yazma | Bir bulgudan, kullanıcı onayıyla görev taslağı oluşturulur. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Uyum kontrolü | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma | — | görüntüleme, oluşturma | görüntüleme | — | — |

## Sürüm notları

### 0.1.0 — Kamu yararı uyum paneli

_2026-11-23_

- **Yeni:** Muafiyet belgesi süresi, makbuz geçerliliği, fon kullanımı (kaba hesap), eğitmen ödeneği ve ekonomik işletme sınırı için iç kontrol listesi. Kurallar veri olarak tutulur ve incelemeden önce yalnız önizlemede çalışır. Vergi danışmanlığı değildir.
