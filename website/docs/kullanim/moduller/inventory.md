---
sidebar_position: 14
title: "Envanter ve Demirbaş"
description: "Dernek demirbaşları, teknik ekipmanlar ve zimmet kayıtlarının takibi."
slug: /kullanim/moduller/inventory
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Dernek demirbaşları, teknik ekipmanlar ve zimmet kayıtlarının takibi.

| | |
|---|---|
| Anahtar | `inventory` |
| Tür | Resmî modül |
| Sürüm | 1.2.0 |
| Sayfalar | `/inventory`, `/inventory/kategoriler` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Muhasebe](./accounting) | yazma | İşaretli eşyaları muhasebede demirbaş (AfA) olarak açar ve senkron tutar. |
| [Modül Yönetimi](./system) | okuma | Muhasebe modülünün etkin olup olmadığını okur. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Envanter | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme | görüntüleme | — | — | görüntüleme |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_inventory_overview` · `list_inventory_items` · `propose_delete_inventory_item` · `propose_inventory_item` · `propose_inventory_status`

## Sürüm notları

### 1.2.0 — AfA yetkisi, CSV güvenliği, yumuşak silme

_2026-11-25_

- **Güvenlik:** AfA'da izlenen eşyada muhasebe demirbaşını değiştiren işlem muhasebe yazma izni ister (SECRETARY/BOARD artık AfA kaydını değiştiremez).
- **Güvenlik:** CSV dışa aktarımında formül enjeksiyonu (=, +, -, @) nötrlenir.
- **Düzeltme:** Asistanla eşya oluşturma artık çalışır (zorunlu alan eksikti).
- **İyileştirme:** Silme yumuşaktır ve tüm işlemler denetim kaydı bırakır.

### 1.1.12 — nav.json kategori ve alt modül tanımı

_2026-11-24_

- **İyileştirme:** Kullanıcı bazlı sol menü gruplama ve alt modül hiyerarşisi için nav.json eklendi.

### 1.1.11 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 1.1.10 — Kod bakımı

_2026-11-19_

- **İyileştirme:** Kullanılmayan kod temizlendi; formlar alan değişikliklerini React Compiler ile uyumlu şekilde izliyor. Görünüm ve davranış değişmedi.

### 1.1.9 — Arayüz altyapısı

_2026-11-18_

- **İyileştirme:** Düğme ve bağlantılar ortak arayüz kitine taşındı. Görünüm ve davranış değişmedi.

### 1.1.8 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

### 1.1.7 — Mobilde alttan açılan çekmece

_2026-11-16_

- **İyileştirme:** Form/ayrıntı çekmecesi mobilde alttan açılır (masaüstünde sağdan).

### 1.1.6 — Asistan önerileri bulutta

_2026-11-16_

- **İyileştirme:** Asistanın öneri araçları (onay kartlı) bulut sağlayıcıda denetimli modda da kullanılabilir.

Daha eski 7 herkese açık sürüm notu.
