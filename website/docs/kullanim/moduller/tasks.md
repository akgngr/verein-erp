---
sidebar_position: 17
title: "Görevler"
description: "Görev ve iş takibi yönetimi."
slug: /kullanim/moduller/tasks
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Görev ve iş takibi yönetimi.

| | |
|---|---|
| Anahtar | `tasks` |
| Tür | Eklenti |
| Sürüm | 1.3.6 |
| Sayfalar | `/tasks`, `/tasks/bana-atananlar` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Üyeler](./members) | okuma | Görev sorumlusu seçmek için üye listesini okur. |
| [Toplantılar](./meetings) | okuma | Görevi bir toplantıya bağlamak için toplantı listesini okur. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Görevler | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme | görüntüleme | — | görüntüleme |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`list_open_tasks` · `propose_complete_task` · `propose_delete_task` · `propose_task`

## Sürüm notları

### 1.3.5 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

### 1.3.4 — Asistan önerileri bulutta

_2026-11-16_

- **İyileştirme:** Asistanın öneri araçları (onay kartlı) bulut sağlayıcıda denetimli modda da kullanılabilir.

### 1.3.3 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 1.3.2 — Asistan araçları yeni veri sözleşmesinde

_2026-11-15_

- **Güvenlik:** Asistan araçları v2 veri sözleşmesine taşındı: modele giden her alan açıkça listelenir ve veri sınıfı bildirilir. Toplam ve kurumsal veriler denetimli bulut modunda da kullanılabilir; serbest kişisel içerik yalnız yerel modelde kalır.

### 1.3.1 — Sürümlü AI öneri ve sonuç sınırları

_2026-11-15_

- **Güvenlik:** Öneri araçları katı Zod girdisi ve sabit model sonucu kullanır; salt öneri sorguları gereksiz kişi detaylarını okumaz. Kalan eski okuma araçlarının dönüşümü ayrı sürer.

### 1.3.0 — Görev ön doldurma

_2026-11-15_

- **İyileştirme:** Yeni görev formu adres parametreleriyle (baslik, aciklama, bitis) önceden doldurulabilir; ör. evraktaki termin.

### 1.2.3 — Açık kimlik bağlantıları

_2026-11-15_

- **Güvenlik:** AI kişi eşleştirmesi yalnız mevcut açık kayıt bağlantılarını kullanır; ad/e-posta tahmini ve veli-çocuk kimlik birleştirmesi reddedilir.

### 1.2.2 — AI v2 takip paketi

_2026-11-15_

- **İyileştirme:** AI iş akışında sayfalama, sorgu sözleşmesi veya worker iptal kontrolü güçlendirildi.

Daha eski 4 herkese açık sürüm notu.
