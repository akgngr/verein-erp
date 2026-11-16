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
| Sürüm | 1.11.2 |
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

### 1.10.2 — Worker için Next.js bağımsız modül durumu

_2026-11-03_

- **Düzeltme:** Modül kullanılabilirliği sorgularının Next.js cache ve lifecycle bağımlılıklarını worker import zincirine taşıması önlendi. Salt okunur modül durumu erişimi, Next.js revalidasyon ve lifecycle işlemlerinden ayrıldı.

### 1.10.1 — Worker uyumlu modül kullanılabilirliği API'si

_2026-11-03_

- **Düzeltme:** Arka plan worker'larının Next.js bağımlılığı içeren geniş server barrel'larını yüklemeden modül kullanılabilirliğini sorgulaması için automation giriş noktası eklendi.

### 1.10.0 — Modül bağımlılıkları

_2026-11-01_

- **Yeni:** Modül bağımlılıkları: zorunlu (requires) ve önerilen (recommends). Etkinleştirirken eksik zorunlu modüller birlikte açılır (gerekirse erişim izni aynı pencerede), önerilenler işaretli seçenek olarak sunulur; kurulu değilse "Yeni modül kur"a yönlendirilir. Kapatırken bağlı modüller onayla birlikte kapanır.
- **İyileştirme:** Kurulum sihirbazı zorunlu bağımlılıkları otomatik ekler; module:check bilinmeyen/döngüsel bağımlılığı, module:install eksik veya eski bağımlılığı reddeder.

### 1.9.0 — Yeni modül kur

_2026-11-01_

- **İyileştirme:** Modül paketleri ayrı menüde değil; Modül Yönetimi'ndeki "Yeni modül kur" butonundan açılır. Menü öğeleri gizlenebilir (hidden) ve başka modülün sayfasına bağlanabilir (module).

### 1.8.0 — Modül paketleri

_2026-11-01_

- **Yeni:** İmzalı modül paketleri (.vmod, Ed25519): pnpm module:keygen / module:pack / module:install. Kurulum imzayı, güvenilen yayıncıyı (src/config/trusted-publishers.json), dosya yollarını/hash'leri, kategoriyi ve sürümü doğrular; hata olursa geri alır.
- **Yeni:** Ayarlar → Modül paketleri: .vmod yükle, doğrulama sonucunu ve kurulum komutunu gör; güvenilen yayıncı listesi. Paket içeriği sunucuda çalıştırılmaz.
- **Güvenlik:** Güven listesi yalnızca kod incelemesiyle değişir; resmî olmayan yayıncılar yalnızca EXTENSION modül yayımlayabilir; kurcalanmış/güvenilmeyen paketler reddedilir.

Daha eski 9 sürüm: [releases.json](https://github.com/akgngr/verein-erp/blob/main/src/modules/system/releases.json)
