---
sidebar_position: 24
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
| Sürüm | 0.10.12 |
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

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Otomasyon | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme | görüntüleme | — | görüntüleme |

## Sürüm notları

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

### 0.10.5 — Sistem bağı bildirildi

_2026-11-15_

- **Güvenlik:** Görev çalıştırmadan önceki modül durumu denetimi artık bildirilmiş erişimle yapılır. Yönetici erişimi bir kez yeniden onaylar.

### 0.10.4 — Merkezi dosya talebi ve güvenli publication

_2026-11-15_

- **Güvenlik:** FileGeneration facade mevcut outbox ile atomiktir; yalnız geçerli worker lease dosyayı yayımlar, pending dosyalar liste/indirmeden gizlenir.

Daha eski 26 herkese açık sürüm notu.
