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
| Sürüm | 1.12.4 |
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

### 1.11.2 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Uygulamanın tüm ekranları HeroUI 3.2.7 bileşenlerine geçirildi. Formlar, tarih seçiciler, çoklu seçimler, tablolar, sekmeler, iletişim kutuları ve bildirimler ortak tasarım sistemini kullanır.
- **İyileştirme:** Çalışma alanı doğal açık yüzeyler, grafit gezinme ve ölçülü yeşil vurgularla yenilendi. Açık/koyu/sistem teması ve mobil gezinme korunur; bileşen renkleri her iki temaya uyarlanır.
- **İyileştirme:** Eski HeroUI v2 bağımlılıkları, geçici paket adları ve tema eklentisi kaldırıldı. Türkçe/Almanca tarih yerelleştirmesi, klavye gezinmesi, form doğrulama mesajları ve yerelleştirilmiş kopyalama bildirimleri yeni bileşenlerle bütünleştirildi.

### 1.11.1 — Sade ve profesyonel çalışma alanı

_2026-11-15_

- **İyileştirme:** Panel kartları ve gezinme kabuğu grafit/yeşil tonlarla yenilendi; ortak tablo, form ve menülerde HeroUI v3 geçişi başladı. Masaüstü/mobil tema seçimi mevcut tercihleri korur.

### 1.11.0 — Silinme hakkı

_2026-11-07_

- **Yeni:** Modül yaşam döngüsüne onUserDeleted kancası eklendi; kişisel panel düzeni kullanıcıyla birlikte silinir.

Daha eski 14 herkese açık sürüm notu.
