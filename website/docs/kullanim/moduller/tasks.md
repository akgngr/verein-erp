---
sidebar_position: 20
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
| Sürüm | 1.3.13 |
| Sayfalar | `/tasks`, `/tasks/bana-atananlar` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Bildirimler](./notifications) | yazma | Görev atandığında atanan kişiye bildirim gönderir. |
| [Üyeler](./members) | okuma | Görev sorumlusu seçmek için üye listesini okur. |
| [Toplantılar](./meetings) | okuma | Görevi bir toplantıya bağlamak için toplantı listesini okur. |
| [Kullanıcılar](./users) | okuma | Sekreter özeti için etkin kullanıcının görev eşleştirmesinde kullanılacak hesap e-posta adresini okur. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Görevler | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme | görüntüleme | — | — | görüntüleme |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`list_open_tasks` · `propose_complete_task` · `propose_delete_task` · `propose_task`

## Sürüm notları

### 1.3.13 — nav.json kategori ve alt modül tanımı

_2026-11-24_

- **İyileştirme:** Kullanıcı bazlı sol menü gruplama ve alt modül hiyerarşisi için nav.json eklendi.

### 1.3.12 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 1.3.11 — Merkezi bildirimler

_2026-11-20_

- **Yeni:** Görev atandığında, atanan üyenin e-postasına karşılık gelen kullanıcıya bildirim gönderilir.

### 1.3.10 — Sekreter önerisinden görev

_2026-11-19_

- **İyileştirme:** Başka modüller, kullanıcının onayladığı sekreter önerisinden açık bir görev oluşturabilir (ör. e-postadan görev).

### 1.3.9 — Sekreter katkısı worker uyumlu

_2026-11-19_

- **Düzeltme:** Sabah özetindeki görev sayıları artık arka plan işinde (günlük özet) de doğru hesaplanır; kimlik eşleştirmesi değişmedi.

### 1.3.8 — Görevler sekreter özeti

_2026-11-18_

- **Yeni:** Bana atanan veya oluşturduğum, bugün vadesi dolan ve geciken açık görev sayıları sekreterde gösterilir.

### 1.3.7 — Arayüz altyapısı

_2026-11-18_

- **İyileştirme:** Düğme ve bağlantılar ortak arayüz kitine taşındı. Görünüm ve davranış değişmedi.

### 1.3.5 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

Daha eski 11 herkese açık sürüm notu.
