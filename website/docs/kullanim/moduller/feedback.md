---
sidebar_position: 18
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
| Sürüm | 1.1.7 |
| Sayfalar | `/geri-bildirim` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Modül Yönetimi](./system) | okuma | Yüzen butonun yalnızca modül etkinken görünmesi için modül durumunu okur. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Geri bildirim | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme, oluşturma | görüntüleme, oluşturma | görüntüleme, oluşturma | görüntüleme, oluşturma | — | görüntüleme, oluşturma | görüntüleme, oluşturma |

## Sürüm notları

### 1.1.7 — Kullanıcı silmede anonimleştirme

_2026-11-25_

- **Güvenlik:** Kullanıcı silinince geri bildirimleri anonimleştirilir ve ekran görüntüleri silinir (DSGVO md. 17).
- **Düzeltme:** Kaydı oluşturan kişi kendi ekran görüntüsünü görebilir.

### 1.1.6 — nav.json kategori ve alt modül tanımı

_2026-11-24_

- **İyileştirme:** Kullanıcı bazlı sol menü gruplama ve alt modül hiyerarşisi için nav.json eklendi.

### 1.1.5 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 1.1.4 — Arayüz altyapısı

_2026-11-18_

- **İyileştirme:** Düğme ve bağlantılar ortak arayüz kitine taşındı. Görünüm ve davranış değişmedi.

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
