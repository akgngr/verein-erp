---
sidebar_position: 28
title: "Otomasyon"
description: "Kalıcı arka plan görevleri ve iş akışları."
slug: /kullanim/moduller/automation
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Kalıcı arka plan görevleri ve iş akışları.

| | |
|---|---|
| Anahtar | `automation` |
| Tür | Eklenti |
| Sürüm | 0.10.20 |
| Sayfalar | `/automation`, `/automation/workflows` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Toplu e-posta](./mailings) | okuma, yazma | Toplu e-posta modülünün güvenilir kampanya görev tanımını worker görev listesine kaydetmek için. |
| [E-posta Altyapısı](./mail) | okuma | Gönderim hatalarını ve SMTP sonuçlarını göstermek için. |
| [Modül Yönetimi](./system) | okuma | Görev çalıştırmadan önce sahibi modülün kurulu ve açık olduğunu denetlemek için. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Otomasyon | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme | görüntüleme | — | — | görüntüleme |

## Sürüm notları

### 0.10.20 — Ayar merkezi grubu

_2026-11-26_

- **İyileştirme:** Ayar sayfaları ayar merkezinde kendi grubunda ve sırasında gösterilir.

### 0.10.19 — Arayüz düzeltmeleri (#586)

_2026-11-25_

- **Düzeltme:** Zamanlanmış görevler okunur adla ve doğru aralıkla (dakika/saat/gün) gösterilir; önceden "meetings.vote_purge" ve "Her 0.1 saatte" görünüyordu.

### 0.10.18 — Sağlık kokpiti için durum özeti

_2026-11-25_

- **İyileştirme:** Modül sağlık kokpiti için kaynak modül başına başarısız/çalışan iş özeti (girdi/sonuç verisi olmadan).

### 0.10.17 — Çalışan izin politikası, denetim kaydı, dil

_2026-11-25_

- **Güvenlik:** Arka plan çalışanı her görevden önce rol geçersiz kılmalarını ve özel rolleri yükler; yüklenemezse görev yeniden denenir.
- **Güvenlik:** Ham hata metinleri yalnız otomasyonu yönetebilen rollere gösterilir; diğerleri hata kodunu görür.
- **İyileştirme:** Tüm otomasyon ve iş akışı işlemleri (onay kararı dahil) denetim kaydı bırakır.
- **Düzeltme:** İş akışı alt görevleri başlatanın dilinde, zamanlanmış görevler belge dilinde çalışır (önceden sabit Almanca).

### 0.10.16 — nav.json kategori ve alt modül tanımı

_2026-11-24_

- **İyileştirme:** Kullanıcı bazlı sol menü gruplama ve alt modül hiyerarşisi için nav.json eklendi.

### 0.10.15 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 0.10.12 — Arayüz altyapısı

_2026-11-18_

- **İyileştirme:** Düğme ve bağlantılar ortak arayüz kitine taşındı. Görünüm ve davranış değişmedi.

### 0.10.10 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

Daha eski 32 herkese açık sürüm notu.
