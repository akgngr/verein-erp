---
sidebar_position: 29
title: "Sekreter"
description: "Kişisel sekreter: sabah özeti ve onaylı öneriler."
slug: /kullanim/moduller/secretary
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Kişisel sekreter: sabah özeti ve onaylı öneriler.

| | |
|---|---|
| Anahtar | `secretary` |
| Tür | Eklenti |
| Sürüm | 0.6.4 |
| Sayfalar | `/sekreter` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Modül Yönetimi](./system) | okuma | Hangi modüllerin açık ve onaylı olduğunu okur; özet yalnız bunların katkılarını gösterir. |
| [Kullanıcılar](./users) | okuma | Günlük özeti yalnız etkin ve sekreter yetkisi olan kullanıcılar için hazırlamak üzere kullanıcının durumunu ve rolünü okur. |
| [E-posta Altyapısı](./mail) | yazma | Günlük özet e-postasını göndermek için mevcut e-posta altyapısını kullanır (yalnız tercihinde e-posta seçen kullanıcıya, yalnız toplam sayılar). |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Sekreter | görüntüleme, düzenleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | — |

## Sürüm notları

### 0.6.4 — Kişisel tercihler ve günlük özet e-postası

_2026-11-19_

- **Yeni:** Her kullanıcı kendi özet saatini, sessiz saatlerini ve kanallarını (uygulama içi, e-posta) kaydedebilir; başkasının tercihleri değiştirilemez.
- **Yeni:** E-posta kanalını seçenlere günlük özet e-postası gönderilir: yalnız toplam sayılar ve uygulamaya bağlantı, kişisel veri yok. Uygulama adresi (APP_URL) ve e-posta ayarı gerekir; sessiz saatlerde ve boş özette gönderilmez.

### 0.6.3 — Günlük özet arka planda güvenilir

_2026-11-19_

- **Düzeltme:** Günlük özet işi arka plan sürecinde (worker) hata vermeden çalışır; tüm modül katkıları orada da hesaplanır.

### 0.6.2 — Özet öğelerinde kapat/ertele/geri al

_2026-11-19_

- **Yeni:** Özet kartlarında kapat, yarına veya bir haftaya ertele ve geri al arayüzü eklendi. Kaynak kayıtlar değiştirilmez.

### 0.6.1 — Bugün ekranı ve sabah özeti kartı

_2026-11-18_

- **Yeni:** Sekreter ekranı yetkiye göre süzülen gerçek sabah özetini, hata ve boş durumlarını ve kaynak modül bağlantılarını gösterir.

### 0.6.0 — Kural kaynaklı öneriler ve onay yolu

_2026-11-18_

- **Yeni:** Modüller sabah özeti öğelerine öneri ekleyebilir (ör. vadesi geçmiş faturaya hatırlatma taslağı). Öneri şifreli saklanır; onaylanınca ilgili modülün kendi eylemi çalışır. Onay anında yetki, modül durumu ve kaynak kaydın değişip değişmediği yeniden denetlenir; çift onay, süresi dolmuş veya bayat öneri çalışmaz. E-posta, ödeme gibi dışa etkili eylemler ayrıca onay ister.

### 0.5.0 — Günlük özet zamanlaması

_2026-11-18_

- **Yeni:** Sabah özeti her gün kullanıcının seçtiği saatte (Europe/Berlin) bir kez hazırlanır. Sessiz saatlere uyulur, aynı gün tekrarlanmaz; yaz/kış saati geçişleri desteklenir. Hesap pasifse veya yetki kaldırıldıysa özet hazırlanmaz.

### 0.4.0 — Özet öğelerini kapatma ve erteleme

_2026-11-18_

- **Yeni:** Sabah özetindeki bir öğe kapatılabilir, en fazla 90 gün ertelenebilir veya yeniden gösterilebilir. Bu yalnız sizin görünümünüzü değiştirir; kaynak kayıt değişmez.

### 0.3.0 — Sabah özeti toplayıcısı

_2026-11-18_

- **Yeni:** Modüllerin sekretere verdiği katkılar tek bir özette toplanır. Yalnız yetkili olunan ve açık modüller görünür; hata veren veya yavaş bir modül özeti durdurmaz. Kapatılan ve ertelenen öğeler gizlenir.

Daha eski 2 herkese açık sürüm notu.
