---
sidebar_position: 33
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
| Sürüm | 0.13.4 |
| Sayfalar | `/sekreter` |
| Önerir | [Evrak Kayıt](./documents) |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Bildirimler](./notifications) | yazma | Yeni öneri oluştuğunda kullanıcıya (içeriksiz) bildirim gönderir. |
| [Modül Yönetimi](./system) | okuma | Hangi modüllerin açık ve onaylı olduğunu okur; özet yalnız bunların katkılarını gösterir. |
| [Kullanıcılar](./users) | okuma | Günlük özeti yalnız etkin ve sekreter yetkisi olan kullanıcılar için hazırlamak üzere kullanıcının durumunu ve rolünü okur. |
| [E-posta Altyapısı](./mail) | yazma | Günlük özet e-postasını göndermek için mevcut e-posta altyapısını kullanır (yalnız tercihinde e-posta seçen kullanıcıya, yalnız toplam sayılar). |
| [Dosyalarım](./exports) | yazma | Haftalık kurul raporunu (yalnız sayılar) Dosyalarım üretim hattında PDF olarak oluşturur; doğrudan indirme bağlantısı yoktur. |
| [Dernek Bilgileri](./organization) | okuma | Rapor antedi için dernek adını, adresini ve logosunu okur. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Sekreter | görüntüleme, düzenleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | — | görüntüleme | — |

## Sürüm notları

### 0.13.4 — Arayüz düzeltmeleri (#586)

_2026-11-25_

- **Düzeltme:** Takip ve yetki devri tarihleri yerel biçimde girilir ve gösterilir (GG.AA.YYYY).

### 0.13.3 — nav.json kategori ve alt modül tanımı

_2026-11-24_

- **İyileştirme:** Kullanıcı bazlı sol menü gruplama ve alt modül hiyerarşisi için nav.json eklendi.

### 0.13.2 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 0.13.1 — Posta taslakları ve evrak incelemesine geçiş

_2026-11-23_

- **İyileştirme:** Posta kaynaklı onaylar ayrı ve taslak olarak gösterilir; evrak OCR incelemesi evrak modülünün kendi yetki ve etkinlik kapılı formuna yönlendirir. Takip, rapor, kanal izni ve vekâlet ekranları korunur.

### 0.13.0 — Vekâlet ve kanal izinleri ekranları

_2026-11-23_

- **Yeni:** Vekâlet verme, geri alma ve salt okunur özet; maskelenmiş harici kanal izinleri ve geri alma eklendi. Yapılandırılmamış kanallarda yeni bağlantı sunulmaz.

### 0.12.2 — Haftalık rapor arayüzü

_2026-11-22_

- **Yeni:** Sekreter sayfasından haftalık kurul raporu talep etme, üretim durumunu kontrol etme ve hazır raporu Dosyalarım'da açma eklendi.

### 0.12.1 — Takip arayüzü

_2026-11-20_

- **Yeni:** Sekreter takipleri için kullanıcı arayüzü eklendi.

### 0.12.0 — Günlük özet bildirim sistemiyle

_2026-11-20_

- **İyileştirme:** Günlük özet artık merkezi bildirim sistemiyle teslim edilir: zildeki kutuda görünür; e-posta, Telegram ve tarayıcı bildirimi seçimi Bildirim tercihlerinden yapılır. Önceki e-posta seçimi ve doğrulanmış kanal rızaları otomatik taşınır.
- **Güvenlik:** Dış kanallara yalnız sayılar ve tarih gider; kişi adı, başlık veya tutar gitmez.

Daha eski 25 herkese açık sürüm notu.
