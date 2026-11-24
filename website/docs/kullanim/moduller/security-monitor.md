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
| Sürüm | 1.3.6 |
| Sayfalar | `/guvenlik-izleme` |
| Gerektirir | [Otomasyon](./automation) |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Otomasyon](./automation) | yazma | Güvenlik testlerini web isteği dışında, kalıcı Automation worker kuyruğunda çalıştırmak için. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Salt okunur |
|---|---|---|---|---|---|---|---|
| Güvenlik İzleme | görüntüleme, oluşturma, düzenleme, silme | — | — | — | görüntüleme | — | — |

## Sürüm notları

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

### 1.3.1 — İş akışı etiketleri

_2026-11-06_

- **İyileştirme:** Güvenlik testleri adımı için okunur ad ve alan etiketleri eklendi.

### 1.3.0 — Güvenlik testleri iş akışlarında; API adresleri düzeltildi

_2026-11-06_

- **Yeni:** Güvenlik testleri iş akışı düzenleyicisinde görev olarak kullanılabilir.
- **Düzeltme:** Güvenlik İzleme ekranı var olmayan /api/modules/... adreslerini çağırdığı için 404 alıyordu; istatistik, çalıştırma ve uyarı istekleri ile test kuyruğa alma artık doğru /api/security-monitor/... adreslerini kullanıyor. Menü etiketi Otomasyon İzleme ile çakışmıyor.

### 1.2.0 — Güvenlik testleri zamanlanabilir

_2026-11-05_

- **Yeni:** Güvenlik testleri Otomasyon ekranından düzenli aralıklarla (en az saatlik) çalışacak şekilde zamanlanabilir.

Daha eski 3 herkese açık sürüm notu.
