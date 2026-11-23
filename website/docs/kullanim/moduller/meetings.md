---
sidebar_position: 38
title: "Toplantılar"
description: "Yönetim kurulu ve genel kurul toplantı takvimi, tutanaklar ve kararlar."
slug: /kullanim/moduller/meetings
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Yönetim kurulu ve genel kurul toplantı takvimi, tutanaklar ve kararlar.

| | |
|---|---|
| Anahtar | `meetings` |
| Tür | Resmî modül |
| Sürüm | 1.3.17 |
| Sayfalar | `/toplantilar`, `/toplantilar/gorevler` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Bildirimler](./notifications) | yazma | Toplantıya katılımcı eklendiğinde ilgili kullanıcıya bildirim gönderir. |
| [Üyeler](./members) | okuma | Toplantıya katılımcı eklemek için üye listesini okur. Duyuru kampanyalarında üye katılımcıların iletişim bilgilerini ve izinlerini okur. |
| [Dernek Bilgileri](./organization) | okuma | Tutanak PDF'inde dernek antetini kullanır. |
| [Toplu e-posta](./mailings) | okuma | Katılımcılara duyuru için Kampanyalar sihirbazını hazır kaynakla açar. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Salt okunur | Sayman | Denetçi | TAX_ADVISOR | Öğretmen |
|---|---|---|---|---|---|---|---|---|
| Toplantı ve Kararlar | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme, oluşturma, düzenleme, onay | görüntüleme, oluşturma, düzenleme | görüntüleme | görüntüleme | görüntüleme | — | — |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_meeting` · `get_meeting_statistics` · `list_meetings` · `propose_delete_meeting` · `propose_meeting` · `propose_meeting_status`

## Sürüm notları

### 1.3.17 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 1.3.16 — Merkezi bildirimler

_2026-11-20_

- **Yeni:** Toplantıya eklenen kullanıcılar bildirim alır.

### 1.3.15 — Toplantılar sekreter özeti

_2026-11-18_

- **Yeni:** Yaklaşan toplantılar ve gündemi eksik toplantılar sekreter sabah özetinde görünür.

### 1.3.14 — Toplantılar sekreter özeti

_2026-11-18_

- **Yeni:** Yaklaşan toplantılar ve gündemi eksik toplantılar sekreter sabah özetinde görünür.

### 1.3.13 — Arayüz altyapısı

_2026-11-18_

- **İyileştirme:** Düğme ve bağlantılar ortak arayüz kitine taşındı. Görünüm ve davranış değişmedi.

### 1.3.11 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

### 1.3.10 — Toplantı silme eylemi ortak UI katmanında

_2026-11-17_

- **İyileştirme:** Eylem butonları ve bildirimler ortak ActionButton/notify adapter katmanına taşındı; ilgili ekran artık bu kullanımda HeroUI Button/Toast implementasyonuna doğrudan bağlı değil.

### 1.3.9 — Katılımcı kontrolleri ortak UI katmanında

_2026-11-17_

- **İyileştirme:** Katılımcı ekleme, toplu işaretleme, hızlı konuk girişi, silme ve bildirim akışları FormTextField, ActionButton ve notify adapter katmanına taşındı.

Daha eski 12 herkese açık sürüm notu.
