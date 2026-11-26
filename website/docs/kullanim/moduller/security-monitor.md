---
sidebar_position: 32
title: "Security Monitor"
description: "Regularly runs system security tests and monitors results"
slug: /kullanim/moduller/security-monitor
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Regularly runs system security tests and monitors results

| | |
|---|---|
| Anahtar | `security-monitor` |
| Tür | Resmî modül |
| Sürüm | 1.4.1 |
| Sayfalar | `/guvenlik-izleme` |
| Gerektirir | [Otomasyon](./automation) |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Otomasyon](./automation) | yazma | Güvenlik testlerini web isteği dışında, kalıcı Automation worker kuyruğunda çalıştırmak için. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Güvenlik İzleme | görüntüleme, oluşturma, düzenleme, silme | — | — | — | görüntüleme | — | — | — |

## Sürüm notları

### 1.4.1 — Ayar merkezi grubu

_2026-11-26_

- **İyileştirme:** Ayar sayfaları ayar merkezinde kendi grubunda ve sırasında gösterilir.

### 1.4.0 — Süreç içi güvenlik denetimi

_2026-11-25_

- **Düzeltme:** 'Testleri çalıştır' artık alt süreçte test paketi başlatmaz (her zaman hata veriyordu); çalışan kurulumun güvenlik ayarları süreç içinde denetlenir: uygulama sırrı, sır şifreleme, HTTPS adres, yükleme klasörü, değiştirilemez denetim kaydı, veritabanı göçleri (yalnızca çözülmemiş hatalar), üretim modu.
- **Güvenlik:** API'ler Zod ile doğrulanır; 401/403/400/404/500 ayrımı yapılır, ham hata mesajı dönmez; çalıştırma ve uyarı işlemleri denetim kaydı bırakır. Kullanılmayan zamanlama API'si kaldırıldı (zamanlama otomasyondadır).

### 1.3.7 — Sayfa yetkisi

_2026-11-25_

- **Güvenlik:** Sayfa sunucuda yetki ister; 'Testleri çalıştır' yalnız oluşturma iznine sahip rollere görünür.

### 1.3.6 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 1.3.5 — Kod bakımı

_2026-11-19_

- **İyileştirme:** Kullanılmayan kod temizlendi; formlar alan değişikliklerini React Compiler ile uyumlu şekilde izliyor. Görünüm ve davranış değişmedi.

### 1.3.4 — Güvenlik paneli ortak UI katmanında

_2026-11-17_

- **İyileştirme:** Güvenlik panelindeki kart, istatistik, durum rozeti ve eylem butonları SurfaceCard, StatCard, StatusChip ve ActionButton ortak pattern'lerine taşındı; ekran artık HeroUI bileşenlerini doğrudan içe aktarmıyor.

### 1.3.3 — Uyarı onaylama ucu düzeltildi

_2026-11-16_

- **Düzeltme:** Uyarı onaylama, kimliği olmayan liste ucundan uyarının kendi ucuna taşındı (action: acknowledge | resolve). Üretim derlemesini durduran tip hatası giderildi.

### 1.3.2 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

Daha eski 6 herkese açık sürüm notu.
