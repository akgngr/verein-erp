---
sidebar_position: 33
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
| Sürüm | 1.3.10 |
| Sayfalar | `/toplantilar`, `/toplantilar/gorevler` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Üyeler](./members) | okuma | Toplantıya katılımcı eklemek için üye listesini okur. Duyuru kampanyalarında üye katılımcıların iletişim bilgilerini ve izinlerini okur. |
| [Dernek Bilgileri](./organization) | okuma | Tutanak PDF'inde dernek antetini kullanır. |
| [Toplu e-posta](./mailings) | okuma | Katılımcılara duyuru için Kampanyalar sihirbazını hazır kaynakla açar. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Salt okunur | Sayman | Denetçi | Öğretmen |
|---|---|---|---|---|---|---|---|
| Toplantı ve Kararlar | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme, oluşturma, düzenleme, onay | görüntüleme, oluşturma, düzenleme | görüntüleme | görüntüleme | görüntüleme | — |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_meeting` · `get_meeting_statistics` · `list_meetings` · `propose_delete_meeting` · `propose_meeting` · `propose_meeting_status`

## Sürüm notları

### 1.3.10 — Toplantı silme eylemi ortak UI katmanında

_2026-11-17_

- **İyileştirme:** Eylem butonları ve bildirimler ortak ActionButton/notify adapter katmanına taşındı; ilgili ekran artık bu kullanımda HeroUI Button/Toast implementasyonuna doğrudan bağlı değil.

### 1.3.9 — Katılımcı kontrolleri ortak UI katmanında

_2026-11-17_

- **İyileştirme:** Katılımcı ekleme, toplu işaretleme, hızlı konuk girişi, silme ve bildirim akışları FormTextField, ActionButton ve notify adapter katmanına taşındı.

### 1.3.8 — Kalan toplantı rozetleri ortak UI katmanında

_2026-11-17_

- **İyileştirme:** Rozet/çip görünümleri ortak StatusChip pattern'ine taşındı; modül düzeyindeki doğrudan HeroUI Chip bağımlılığı azaltıldı.

### 1.3.7 — Toplantı rozetleri ortak UI katmanında

_2026-11-17_

- **İyileştirme:** Tekrarlanan HeroUI durum/tür rozetleri ortak StatusChip pattern'ine taşındı; modül görsel sözleşmesi framework implementasyonundan ayrıştırıldı.

### 1.3.6 — Asistan önerileri bulutta

_2026-11-16_

- **İyileştirme:** Asistanın öneri araçları (onay kartlı) bulut sağlayıcıda denetimli modda da kullanılabilir.

### 1.3.5 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 1.3.4 — Asistan araçları yeni veri sözleşmesinde

_2026-11-15_

- **Güvenlik:** Asistan araçları v2 veri sözleşmesine taşındı: modele giden her alan açıkça listelenir ve veri sınıfı bildirilir. Toplam ve kurumsal veriler denetimli bulut modunda da kullanılabilir; serbest kişisel içerik yalnız yerel modelde kalır.

### 1.3.3 — Sürümlü AI öneri ve sonuç sınırları

_2026-11-15_

- **Güvenlik:** Öneri araçları katı Zod girdisi ve sabit model sonucu kullanır; salt öneri sorguları gereksiz kişi detaylarını okumaz. Kalan eski okuma araçlarının dönüşümü ayrı sürer.

Daha eski 6 sürüm: [releases.json](https://github.com/akgngr/verein-erp/blob/main/src/modules/meetings/releases.json)
