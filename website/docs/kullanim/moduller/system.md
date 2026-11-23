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
| Sürüm | 1.17.0 |
| Sayfalar | `/ayarlar`, `/ayarlar/widgetlar`, `/ayarlar/moduller`, `/ayarlar/moduller/saglik`, `/ayarlar/moduller/paketler`, `/ayarlar/kurulum`, `/ayarlar/lisans`, `/ayarlar/surum-notlari` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Muhasebe](./accounting) | okuma, yazma | Kurulum sihirbazı, seçilen kurum türüne göre muhasebe kategorilerini, hesaplarını ve vergi ayarlarını oluşturur. |
| [Dernek Bilgileri](./organization) | okuma | Lisans doğrulaması için kurum adı ve sicil/vergi numarası okunur (lisans bu kuruma bağlıdır). |
| [Kullanıcılar](./users) | okuma | Modül ve iş akışı sağlığı kokpitinde yönetici kullanıcısının varlığı denetlenir. |
| [Yapay zekâ asistanı](./ai) | okuma | Gizlilik ön ayarları ve aylık veri çıkışı raporu için yapılandırılmış yapay zekâ sağlayıcılarının durumu okunur. |
| [Widget Platformu](./widgets) | okuma, yazma | Widget tercihlerini gösterir ve kullanıcının değişikliklerini kaydeder. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Sistem Ayarları | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme |
| Modül Yönetimi | görüntüleme, düzenleme, silme | görüntüleme | — | — | — | — | — |

## Sürüm notları

### 1.17.0 — Veri çıkışı defteri ve gizlilik ön ayarları (F2a)

_2026-11-23_

- **Yeni:** Tüm dış ağ bağdaştırıcıları (yapay zekâ sağlayıcıları, bildirimler, kampanya kanalları, bankacılık, takvim senkronizasyonu, e-posta, hava durumu ve döviz kuru) içerik veya kişisel veri saklamadan kategori, sağlayıcı, hacim/adet ve hukuki dayanak meta verilerini veri çıkışı defterine (SystemEgressLedger) yazar.
- **Yeni:** Aylık veri çıkışı raporlayıcısı yapılandırma, gerçekleşen aktarımlar ve sağlayıcı tarafı saklama sürelerini birbirinden ayırır; akış kapatılsa bile geçmiş aktarım kayıtları değiştirilmez.
- **Yeni:** Strict / Standard / Connected gizlilik ön ayarları veri olarak tanımlandı; önizleme farkı üretir, yönetici onayı ile uygulanır ve Strict profilinde kendi sunucunuzda barındırılan model ucu önerilir.

### 1.16.0 — Kişisel widget ayarları

_2026-11-23_

- **Yeni:** Widget görünürlük ve sıralama ayarları, sıfırlama ve masaüstü/mobil önizleme kullanıcı hesabına bağlandı.

### 1.15.0 — Modül ve iş akışı sağlığı kokpiti (F3)

_2026-11-23_

- **Yeni:** Ayarlar → Modül Yönetimi → Modül ve İş Akışı Sağlığı: etkin modüllerin yapılandırma bütünlüğü, erişim onayları, worker kalp atışı ve kuyruk hata durumları tek ekranda özetlenir.
- **Yeni:** Hata kodları kişisel veri sızdırmadan güvenli kategorilere (TIMEOUT, NETWORK, DATABASE, AUTH) indirgenir; sorunlu alanlar için doğrudan ilgili ayar ekranına yönlendirme kılavuzu sunulur.

### 1.14.0 — Üst çubuk widget altyapısı

_2026-11-22_

- **Yeni:** Üst çubukta yetki ve kullanıcı tercihlerine göre görünen Ayarlar kısayolu widget’ı eklendi; masaüstü ve mobilde tek bileşen yüklenir.

### 1.13.0 — Enterprise lisansı

_2026-11-20_

- **Yeni:** Ayarlar → Lisans: imzalı Enterprise lisansı girilir, çevrimdışı doğrulanır; lisans hem alan adına hem kuruma bağlıdır, süre bitince 14 gün ek süre.
- **Yeni:** Lisanslı modüller yalnız ilgili özelliği içeren geçerli lisansla etkinleşir; lisans yoksa menüde, sayfada, API'de ve arka plan işlerinde kapalı kalır.

### 1.12.8 — Çalışma zamanı modernizasyonu

_2026-11-20_

- **İyileştirme:** Modül kapatma eyleminde (toggleModuleAction) basamaklı bağımlı dizilimi toReversed ile yenilendi.

### 1.12.7 — Panel sağ sütunu

_2026-11-19_

- **İyileştirme:** Panel'de modüllerin bağlanabildiği sağ sütun (mobilde üstte) eklendi; sütun yalnız gösterilecek kart varsa görünür.

### 1.12.6 — Arayüz altyapısı

_2026-11-18_

- **İyileştirme:** Düğme ve bağlantılar ortak arayüz kitine taşındı. Görünüm ve davranış değişmedi.

Daha eski 22 herkese açık sürüm notu.
