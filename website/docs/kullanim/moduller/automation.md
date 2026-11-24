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
| Sürüm | 0.10.16 |
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

### 0.10.9 — Onay eylemleri ortak UI katmanında

_2026-11-17_

- **İyileştirme:** Workflow onay/red eylemleri ortak ActionButton/notify pattern'lerine taşındı; approvals panel artık HeroUI Button/Toast bileşenlerini doğrudan içe aktarmıyor.

### 0.10.8 — Çalışma eylemleri ortak UI katmanında

_2026-11-17_

- **İyileştirme:** Eylem butonları ve bildirimler ortak ActionButton/notify adapter katmanına taşındı; ilgili ekran artık bu kullanımda HeroUI Button/Toast implementasyonuna doğrudan bağlı değil.

### 0.10.7 — Çalışma durumu rozeti ortak UI katmanında

_2026-11-17_

- **İyileştirme:** Rozet görünümü ortak StatusChip pattern'ine taşındı; modül artık bu kullanımda HeroUI Chip implementasyonuna doğrudan bağlı değil.

### 0.10.6 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

Daha eski 28 herkese açık sürüm notu.
