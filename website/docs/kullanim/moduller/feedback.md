---
sidebar_position: 15
title: "Geri bildirim"
description: "Test kullanıcılarının hata ve önerilerini toplar."
slug: /kullanim/moduller/feedback
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Test kullanıcılarının hata ve önerilerini toplar.

| | |
|---|---|
| Anahtar | `feedback` |
| Tür | Resmî modül |
| Sürüm | 1.1.2 |
| Sayfalar | `/geri-bildirim` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Modül Yönetimi](./system) | okuma | Yüzen butonun yalnızca modül etkinken görünmesi için modül durumunu okur. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Geri bildirim | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme, oluşturma | görüntüleme, oluşturma | görüntüleme, oluşturma | görüntüleme, oluşturma | görüntüleme, oluşturma | görüntüleme, oluşturma |

## Sürüm notları

### 1.1.2 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

### 1.1.1 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 1.1.0 — İş akışı tetikleyicileri

_2026-11-06_

- **Yeni:** İş akışı tetikleyicisi: "Geri bildirim gönderildiğinde" (tür, öncelik; {{feedback.title}} vb.).

### 1.0.0 — Geri bildirim modülü

_2026-11-01_

- **Yeni:** Sağ altta geri bildirim butonu: ilk açılışta kısa bir sesle kendini tanıtır; hata bildirimi veya öneri gönderilebilir, isteğe bağlı ekran görüntüsü eklenir. Sayfa adresi ve tarayıcı bilgisi otomatik eklenir.
- **Yeni:** Geri bildirim listesi: herkes kendi kayıtlarını, yöneticiler tümünü görür; durum, öncelik ve cevap yönetimi. Ekran görüntüleri yalnızca yetkililere açıktır.
