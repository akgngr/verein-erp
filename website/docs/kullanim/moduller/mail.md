---
sidebar_position: 10
title: "E-posta Altyapısı"
description: "Tüm modüller için ortak e-posta gönderim altyapısı, SMTP ayarları ve gönderim kayıtları."
slug: /kullanim/moduller/mail
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Tüm modüller için ortak e-posta gönderim altyapısı, SMTP ayarları ve gönderim kayıtları.

| | |
|---|---|
| Anahtar | `mail` |
| Tür | Çekirdek (her zaman açık) |
| Sürüm | 1.4.4 |
| Sayfalar | `/mail`, `/mail/gelen-kutusu`, `/mail/kayitlar` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Muhasebe](./accounting) | yazma | Gelen e-postalardaki fatura/belge eklerini muhasebe → gelen faturalar kutusuna aktarır. |
| [Modül Yönetimi](./system) | okuma | Muhasebe modülünün etkin olup olmadığını okur (aktarma düğmesi yalnızca etkinken gösterilir). |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Gelen kutusu | görüntüleme, oluşturma, düzenleme, silme | — | — | görüntüleme, oluşturma | — | — | — |
| E-posta altyapısı | görüntüleme, oluşturma, düzenleme | — | — | — | görüntüleme | — | — |

## Sürüm notları

### 1.4.4 — Arayüz altyapısı

_2026-11-18_

- **İyileştirme:** Düğme ve bağlantılar ortak arayüz kitine taşındı. Görünüm ve davranış değişmedi.

### 1.4.2 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

### 1.4.1 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 1.4.0 — İş akışı alanları ve değişkenler

_2026-11-06_

- **Yeni:** Bildirim e-postası metinlerinde üye alanları kullanılabilir; alıcı olarak {{member.email}} ile yeni üyeye de gönderilebilir.

### 1.3.4 — Hydration düzeltmesi

_2026-11-06_

- **Düzeltme:** Gelen kutusu ayarlarındaki güvenlik seçiminde oluşan hydration hatası giderildi.

### 1.3.3 — İzleme logları

_2026-11-06_

- **İyileştirme:** Bildirim e-postası adımı gönderim sonucunu (maskeli alıcı, SMTP hatası, günlük kimliği) terminale yazar.

### 1.3.2 — İş akışı hata düzeltmeleri

_2026-11-06_

- **Düzeltme:** Bildirim e-postası adımı, e-posta ayarlanmamışsa yeniden denemeden hemen MAIL_NOT_CONFIGURED ile başarısız olur.

### 1.3.1 — İş akışı etiketleri

_2026-11-06_

- **İyileştirme:** Bildirim e-postası adımı için alan etiketleri ve açıklamalar eklendi.

Daha eski 6 herkese açık sürüm notu.
