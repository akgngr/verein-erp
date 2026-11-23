---
sidebar_position: 42
title: "Widget Platformu"
description: "Modüllerin üst çubuk ve paneller için bileşenlerini güvenli biçimde toplar."
slug: /kullanim/moduller/widgets
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Modüllerin üst çubuk ve paneller için bileşenlerini güvenli biçimde toplar.

| | |
|---|---|
| Anahtar | `widgets` |
| Tür | Çekirdek (her zaman açık) |
| Sürüm | 0.3.0 |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Widget'lar | görüntüleme, düzenleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme |

## Sürüm notları

### 0.3.0 — Widget ayar ekranı sözleşmesi

_2026-11-23_

- **Yeni:** Widget görünürlük ve sıralama ayarları, sıfırlama ve masaüstü/mobil önizleme kullanıcı hesabına bağlandı.

### 0.2.0 — Widget tercihleri ve yönetici politikası

_2026-11-22_

- **Yeni:** Kullanıcı widget'ları açıp kapatabilir ve sıralayabilir; yönetici isteğe bağlı widget'ları herkes için kapatabilir. Zorunlu widget'lar kapatılamaz; tercihler sunucuda doğrulanır.

### 0.1.0 — Widget kayıt altyapısı

_2026-11-21_

- **Yeni:** Modüller widget'larını kendi widget.ts dosyalarında tanımlar; kayıt derleme anında güvenli biçimde üretilir. Görünür değişiklik sonraki sürümlerde gelir.
