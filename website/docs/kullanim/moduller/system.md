---
sidebar_position: 26
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
| Sürüm | 1.18.5 |
| Sayfalar | `/ayarlar`, `/ayarlar/widgetlar`, `/ayarlar/moduller`, `/ayarlar/moduller/saglik`, `/ayarlar/moduller/paketler`, `/ayarlar/kurulum`, `/ayarlar/lisans`, `/ayarlar/gizlilik`, `/ayarlar/veri-cikisi`, `/ayarlar/menu`, `/ayarlar/surum-notlari` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Muhasebe](./accounting) | okuma, yazma | Kurulum sihirbazı, seçilen kurum türüne göre muhasebe kategorilerini, hesaplarını ve vergi ayarlarını oluşturur. |
| [Dernek Bilgileri](./organization) | okuma | Lisans doğrulaması için kurum adı ve sicil/vergi numarası okunur (lisans bu kuruma bağlıdır). |
| [Kullanıcılar](./users) | okuma, yazma | Modül ve iş akışı sağlığı kokpitinde yönetici kullanıcısının varlığı denetlenir. |
| [Yapay zekâ asistanı](./ai) | okuma | Gizlilik ön ayarları ve aylık veri çıkışı raporu için yapılandırılmış yapay zekâ sağlayıcılarının durumu okunur. |
| [Widget Platformu](./widgets) | okuma, yazma | Widget tercihlerini gösterir ve kullanıcının değişikliklerini kaydeder. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Sistem Ayarları | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | — | görüntüleme | görüntüleme |
| Modül Yönetimi | görüntüleme, düzenleme, silme | görüntüleme | — | — | — | — | — | — |

## Sürüm notları

### 1.18.5 — Menü grubu kimlik çakışması düzeltmesi

_2026-11-25_

- **Düzeltme:** Yeni özel grup kimlikleri mevcut gruplarla çakışmayacak şekilde benzersiz üretilir.

### 1.18.4 — Menü grupları için sıralama ve ikon seçimi

_2026-11-25_

- **İyileştirme:** Menü düzeni sayfasında özel gruplar modüller arasında yukarı/aşağı sıralanabilir ve ikon seçilebilir hâle getirildi.

### 1.18.3 — Menü düzeni ayar sayfası

_2026-11-24_

- **İyileştirme:** Kullanıcı bazlı menü özelleştirme sayfası Ayarlar menüsüne (/ayarlar/menu) taşındı.

### 1.18.2 — Lisans özelliği kontrolü dışa aktarımı

_2026-11-24_

- **İyileştirme:** hasLicensedFeature fonksiyonu modül sunucu sözleşmesine eklendi.

### 1.18.1 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 1.18.0 — Gizlilik profilleri ve aylık veri çıkışı raporu (F2b)

_2026-11-23_

- **Yeni:** Strict / Standard / Connected gizlilik profilleri için modül ve yapay zekâ sağlayıcısı değişikliklerini önce gösteren, açık yönetici onayı gerektiren arayüz eklendi.
- **Yeni:** Aylık veri çıkışı ekranı mevcut yapılandırma, gerçekleşen aktarımlar ve sağlayıcı tarafı saklama politikalarını ayrı bölümlerde gösterir.
- **İyileştirme:** İki dilli ekranlar, yetki denetimi, önizleme onayı ve egress sözleşme testleri eklendi.

### 1.17.0 — Veri çıkışı defteri ve gizlilik ön ayarları (F2a)

_2026-11-23_

- **Yeni:** Tüm dış ağ bağdaştırıcıları (yapay zekâ sağlayıcıları, bildirimler, kampanya kanalları, bankacılık, takvim senkronizasyonu, e-posta, hava durumu ve döviz kuru) içerik veya kişisel veri saklamadan kategori, sağlayıcı, hacim/adet ve hukuki dayanak meta verilerini veri çıkışı defterine (SystemEgressLedger) yazar.
- **Yeni:** Aylık veri çıkışı raporlayıcısı yapılandırma, gerçekleşen aktarımlar ve sağlayıcı tarafı saklama sürelerini birbirinden ayırır; akış kapatılsa bile geçmiş aktarım kayıtları değiştirilmez.
- **Yeni:** Strict / Standard / Connected gizlilik ön ayarları veri olarak tanımlandı; önizleme farkı üretir, yönetici onayı ile uygulanır ve Strict profilinde kendi sunucunuzda barındırılan model ucu önerilir.

### 1.16.0 — Kişisel widget ayarları

_2026-11-23_

- **Yeni:** Widget görünürlük ve sıralama ayarları, sıfırlama ve masaüstü/mobil önizleme kullanıcı hesabına bağlandı.

Daha eski 28 herkese açık sürüm notu.
