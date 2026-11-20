---
sidebar_position: 22
title: "Modül Yönetimi"
description: "Sistemde yüklü çekirdek, resmi ve eklenti modüllerin yönetimi."
slug: /kullanim/moduller/system
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Sistemde yüklü çekirdek, resmi ve eklenti modüllerin yönetimi.

| | |
|---|---|
| Anahtar | `system` |
| Tür | Çekirdek (her zaman açık) |
| Sürüm | 1.12.8 |
| Sayfalar | `/ayarlar`, `/ayarlar/moduller`, `/ayarlar/moduller/paketler`, `/ayarlar/kurulum`, `/ayarlar/surum-notlari` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Muhasebe](./accounting) | okuma, yazma | Kurulum sihirbazı, seçilen kurum türüne göre muhasebe kategorilerini, hesaplarını ve vergi ayarlarını oluşturur. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Sistem Ayarları | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme |
| Modül Yönetimi | görüntüleme, düzenleme, silme | görüntüleme | — | — | — | — | — |

## Sürüm notları

### 1.12.8 — Çalışma zamanı modernizasyonu

_2026-11-20_

- **İyileştirme:** Modül kapatma eyleminde (toggleModuleAction) basamaklı bağımlı dizilimi toReversed ile yenilendi.

### 1.12.7 — Panel sağ sütunu

_2026-11-19_

- **İyileştirme:** Panel'de modüllerin bağlanabildiği sağ sütun (mobilde üstte) eklendi; sütun yalnız gösterilecek kart varsa görünür.

### 1.12.6 — Arayüz altyapısı

_2026-11-18_

- **İyileştirme:** Düğme ve bağlantılar ortak arayüz kitine taşındı. Görünüm ve davranış değişmedi.

### 1.12.3 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

### 1.12.2 — Ortak UI kartları

_2026-11-17_

- **İyileştirme:** Yüzey kartları ortak SurfaceCard bileşenini kullanıyor.

### 1.12.1 — Modül paketleri ortak UI katmanında

_2026-11-17_

- **İyileştirme:** Modül paketleri ekranındaki yükleme, silme, kopyalama, durum rozetleri ve bildirimler ActionButton, StatusChip ve notify adapter katmanına taşındı; ekran artık HeroUI bileşenlerini doğrudan içe aktarmıyor.

### 1.12.0 — Yüzey kartları

_2026-11-17_

- **Yeni:** Modül kartları başka modül ekranlarında da gösterilebilir (surfaces); modül onayı ve yetki sistem tarafından denetlenir, modüller arası yeni erişim gerekmez.

### 1.11.3 — Hafif hareket ve yüzey etkileşimleri

_2026-11-17_

- **İyileştirme:** Sayfa başlıkları, form yüzeyleri ve panel kartları ortak motion tokenlarıyla hafif giriş, hover ve focus geçişleri kullanır. Reduced-motion tercihi korunur.

Daha eski 17 herkese açık sürüm notu.
