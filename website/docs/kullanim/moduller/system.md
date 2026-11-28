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
| Sürüm | 1.21.1 |
| Sayfalar | `/ayarlar`, `/ayarlar/widgetlar`, `/ayarlar/moduller`, `/ayarlar/moduller/saglik`, `/ayarlar/moduller/paketler`, `/ayarlar/kurulum`, `/ayarlar/lisans`, `/ayarlar/gizlilik`, `/ayarlar/veri-cikisi`, `/ayarlar/menu`, `/ayarlar/yedekleme`, `/ayarlar/surum-notlari` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Muhasebe](./accounting) | okuma, yazma | Kurulum sihirbazı, seçilen kurum türüne göre muhasebe kategorilerini, hesaplarını ve vergi ayarlarını oluşturur. |
| [Dernek Bilgileri](./organization) | okuma | Lisans doğrulaması için kurum adı ve sicil/vergi numarası okunur (lisans bu kuruma bağlıdır). |
| [Kullanıcılar](./users) | okuma, yazma | Modül ve iş akışı sağlığı kokpitinde yönetici kullanıcısının varlığı denetlenir. |
| [Yapay zekâ asistanı](./ai) | okuma | Gizlilik ön ayarları ve aylık veri çıkışı raporu için yapılandırılmış yapay zekâ sağlayıcılarının durumu okunur. |
| [Widget Platformu](./widgets) | okuma, yazma | Widget tercihlerini gösterir ve kullanıcının değişikliklerini kaydeder. |
| [Otomasyon](./automation) | okuma | Modül sağlık kokpitinde başarısız arka plan işleri ve worker kalp atışı okunur (girdi/sonuç verisi okunmaz). |
| [Bildirimler](./notifications) | okuma | Modül sağlık kokpitinde hangi bildirim kanallarının etkin olduğu okunur (sır ve ayar okunmaz). |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Sistem Ayarları | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme |
| Modül Yönetimi | görüntüleme, düzenleme, silme | görüntüleme | — | — | — | — | — | — |

## Sürüm notları

### 1.21.1 — Üye silme kancaları

_2026-11-28_

- **İyileştirme:** Modüller onMemberDeleted yaşam döngüsü kancasıyla, silinen üyeye ait kişisel verilerini temizleyebilir; runMemberDeletionHooks tüm kancaları çalıştırır, hata diğerlerini durdurmaz.

### 1.21.0 — Şifreli yedekleme ve kurtarma doğrulama ekranı (#617)

_2026-11-26_

- **Yeni:** PostgreSQL veritabanı ve UPLOAD_DIR dosyalarını SHA-256 manifesti ve şema sürümüyle tek AES-256-GCM şifreli arşiv (.vbak) olarak paketleyen otomatik ve isteğe bağlı yedekleme servisi eklendi.
- **Güvenlik:** Canlı veriyi değiştirmeden şifre çözme, bütünlük (SHA-256) ve şema uyumluluğunu test eden kurtarma doğrulama akışı (hem kayıtlı hem yüklenen arşivler için) ve tam denetim kaydı eklendi.

### 1.20.0 — Gruplu ayar merkezi

_2026-11-26_

- **Yeni:** Ayar merkezi artık dokuz gruba ayrılıyor (Genel, Kullanıcılar ve erişim, Güvenlik ve gizlilik, Entegrasyonlar, Görünüm, İletişim, Yapay zekâ ve otomasyon, Modül yönetimi, Sistem yönetimi). Gruplar ve sıra modül tanımlarından gelir; sol paneldeki Ayarlar alt menüsü aynı sırayı izler.

### 1.19.2 — Arayüz düzeltmeleri (#586)

_2026-11-25_

- **İyileştirme:** Ayarlar genel bakışında her kart kendi açıklamasını gösterir; aynı modül açıklaması artık altı kartta tekrarlanmaz.

### 1.19.1 — Herkese açık sayfalarda modül kapısı

_2026-11-25_

- **Güvenlik:** Anonim ziyaretçi /portal, /oy, /formular gibi sayfalarda modül yönetimi metni yerine yalnız 'sayfa kullanılamıyor' görür; API'ler 404 döner.
- **İyileştirme:** Sağlık kokpiti, üye portalı açık ama PORTAL_ENABLED kapalıysa uyarır.

### 1.19.0 — Sağlık kokpiti, kurulum sihirbazı ve gizlilik ön ayarları

_2026-11-25_

- **Düzeltme:** Sağlık kokpiti başarısız arka plan işlerini ve worker kalp atışını doğru gösterir (önceden yanlış tablo sorgulanıp hep 0 görünüyordu); veriler modüllerin public API'lerinden okunur.
- **İyileştirme:** Çekirdek (CORE) modüllerin erişimi her zaman onaylıdır; yeni kurulumda ve güncellemelerde 'izin bekliyor' görünmez.
- **Güvenlik:** Gizlilik ön ayarı bağımlılıkları ve erişim onaylarını denetler; engel varsa önizlemede listelenir ve uygulanmaz.
- **Düzeltme:** Kurulum sihirbazı açık modülleri yalnız açık onayla kapatır, zorunlu bağımlılıkları (örn. otomasyon) açar, dernek ön ayarına SEPA, CRM, toplu e-posta ve hibeleri ekler ve muhasebe varsayılan eşlemelerini doldurur.
- **Düzeltme:** 'settings' izni tek tanıma indirildi; Menü düzeni sayfası sunucuda yetki ister; yöneticiler widget'ları herkes için açıp kapatabilir.

### 1.18.5 — Menü grubu kimlik çakışması düzeltmesi

_2026-11-25_

- **Düzeltme:** Yeni özel grup kimlikleri mevcut gruplarla çakışmayacak şekilde benzersiz üretilir.

### 1.18.4 — Menü grupları için sıralama ve ikon seçimi

_2026-11-25_

- **İyileştirme:** Menü düzeni sayfasında özel gruplar modüller arasında yukarı/aşağı sıralanabilir ve ikon seçilebilir hâle getirildi.

Daha eski 34 herkese açık sürüm notu.
