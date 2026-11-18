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
| Sürüm | 0.6.0 |
| Sayfalar | `/sekreter` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Modül Yönetimi](./system) | okuma | Hangi modüllerin açık ve onaylı olduğunu okur; özet yalnız bunların katkılarını gösterir. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Sekreter | görüntüleme, düzenleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | — |

## Sürüm notları

### 0.6.0 — Kural kaynaklı öneriler ve onay yolu

_2026-11-18_

- **Yeni:** Modüller sabah özeti öğelerine öneri ekleyebilir (ör. vadesi geçmiş faturaya hatırlatma taslağı). Öneri şifreli saklanır; onaylanınca ilgili modülün kendi eylemi çalışır. Onay anında yetki, modül durumu ve kaynak kaydın değişip değişmediği yeniden denetlenir; çift onay, süresi dolmuş veya bayat öneri çalışmaz. E-posta, ödeme gibi dışa etkili eylemler ayrıca onay ister.

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
