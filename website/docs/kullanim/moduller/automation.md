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
| Sürüm | 0.10.7 |
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

### 0.10.3 — Worker toparlanması ve dosya hata durumu

_2026-11-15_

- **Düzeltme:** Geçici export hataları sınırlı yeniden denenir; terminal/iptal durumları kuyrukta görünmez, başarısız geçici dosyalar temizlenir.

### 0.10.2 — AI v2 güvenilirlik ve veri koruma

_2026-11-14_

- **Güvenlik:** Sunucu tarafından doğrulanan AI işlemleri, kapsamlı veri erişimi ve güvenilir yaşam döngüsü kontrolleri güncellendi.

### 0.10.1 — Koşul değerleri düzeltmesi

_2026-11-07_

- **Düzeltme:** Evet/hayır alanları (ör. "Tüm gün") koşulda artık Evet/Hayır listesiyle seçiliyor; elle true/false yazmak gerekmiyor.
- **Düzeltme:** Değeri seçilmemiş koşul yayımlanırken adım adıyla uyarı verir (sessizce boş değerle karşılaştırılmaz); boş liste "Bir değer seçin" gösterir.

### 0.10.0 — Modüller için iş akışı API'si

_2026-11-07_

- **Yeni:** Diğer modüller (ör. Kampanyalar) kendi iş akışlarını oluşturup yayımlayabilir ve başlatabilir; yetki denetimi çağıran modüldedir.

Daha eski 22 sürüm: [releases.json](https://github.com/akgngr/verein-erp/blob/main/src/modules/automation/releases.json)
