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
| Sürüm | 0.12.2 |
| Sayfalar | `/sekreter` |

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

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Sekreter | görüntüleme, düzenleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | — |

## Sürüm notları

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

### 0.11.5 — Bildirim modülü erişim sözleşmesi

_2026-11-20_

- **Düzeltme:** Sekreterin bildirim modülüne mevcut erişimi modül sözleşmesinde açıkça bildirildi.

### 0.11.4 — Takip listesi yeniden deneme

_2026-11-20_

- **Düzeltme:** Takip listesi yüklenemediğinde hata ekranından yeniden deneme olanağı eklendi.

### 0.11.3 — Merkezi bildirimler

_2026-11-20_

- **Yeni:** Onay bekleyen yeni sekreter önerileri bildirim olarak görünür (içerik yok).

### 0.11.2 — Çalışma zamanı modernizasyonu

_2026-11-20_

- **İyileştirme:** Sabah özeti öğelerinin önem ve vade sırasına göre dizilmesinde (sortItems) toSorted metodu uygulandı.

### 0.11.1 — Sekreter çalışma masasında geçerli kayıt sınırı

_2026-11-20_

- **Düzeltme:** Geçersiz veya yetkisiz gösterim kayıtları ilk 100 öğeyi doldurup sonraki geçerli kayıtları gizleyemez; görünüm en fazla 100 doğrulanmış öğe gösterir.

Daha eski 20 herkese açık sürüm notu.
