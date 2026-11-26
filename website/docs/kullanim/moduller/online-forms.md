---
sidebar_position: 13
title: "e-Sign"
description: "e-Sign: kişiye süreli bağlantı, form tamamlama, Datenschutz onayı, imza ve imzalı PDF belgeleri."
slug: /kullanim/moduller/online-forms
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

e-Sign: kişiye süreli bağlantı, form tamamlama, Datenschutz onayı, imza ve imzalı PDF belgeleri.

| | |
|---|---|
| Anahtar | `online-forms` |
| Tür | Resmî modül |
| Sürüm | 1.4.1 |
| Sayfalar | `/online-formlar` |
| Gerektirir | [Toplu e-posta](./mailings) |
| Önerir | [Üyeler](./members), [Öğrenciler](./students) |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Üyeler](./members) | okuma, yazma | Üyenin formdaki alanlarını okur ve imzalanan formu üye kaydına yazar. |
| [Öğrenciler](./students) | okuma, yazma | Öğrenci ve veli alanlarını okur, imzalanan formu kayda yazar; reşit olmayan öğrencide veliyi bulur. |
| [Toplu e-posta](./mailings) | okuma, yazma | Form bağlantısını e-posta, SMS veya WhatsApp kanalından tek kişiye gönderir. |
| [Dernek Bilgileri](./organization) | okuma | Mesajda ve formda kuruluş adını kullanır. |
| [Otomasyon](./automation) | yazma | İmzalı form PDF'ini arka planda üretmek için iş kuyruğunu kullanır. |
| [Modül Yönetimi](./system) | okuma | Kaynak modüllerin açık olup olmadığını kontrol eder. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| e-Sign | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | — | görüntüleme | — | — | — |

## Sürüm notları

### 1.4.1 — Kanonik APP_URL form bağlantıları

_2026-11-25_

- **Güvenlik:** Çevrimiçi form paylaşım bağlantıları kanonik APP_URL kökü üzerinden oluşturuluyor (#574).

### 1.4.0 — Üye SEPA yenileme, IBAN doğrulama, güvenlik

_2026-11-25_

- **Yeni:** Üye formlarında SEPA yetki yenileme için IBAN, BIC, hesap sahibi ve yetki onayı; onaylanınca üye kaydındaki yetki güncellenir.
- **Güvenlik:** IBAN Mod-97 ile doğrulanır; herkese açık form gönderimi hız sınırlıdır; açılma zamanı GET'te değil tarayıcıda form gösterilince kaydedilir; portal içi imza (belgesiz/kanıtsız) kapatıldı.
- **İyileştirme:** Belge silme onayı uygulamanın onay penceresiyle.
- **Düzeltme:** Banka bilgisi veya SEPA onayı içeren üye formlarında imzalı kanıt PDF'i SEPA yetki metnini ve onay durumunu içerir.

### 1.3.3 — nav.json kategori ve alt modül tanımı

_2026-11-24_

- **İyileştirme:** Kullanıcı bazlı sol menü gruplama ve alt modül hiyerarşisi için nav.json eklendi.

### 1.3.2 — Üye portalı belge imzalama sözleşmesi

_2026-11-24_

- **Yeni:** Üyenin bekleyen çevrimiçi formlarını portal üzerinden imzalaması için sözleşme eklendi.

### 1.3.1 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 1.2.7 — Kod bakımı

_2026-11-19_

- **İyileştirme:** Kullanılmayan kod temizlendi; formlar alan değişikliklerini React Compiler ile uyumlu şekilde izliyor. Görünüm ve davranış değişmedi.

### 1.2.6 — Arayüz altyapısı

_2026-11-18_

- **İyileştirme:** Düğme ve bağlantılar ortak arayüz kitine taşındı. Görünüm ve davranış değişmedi.

### 1.2.4 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

Daha eski 7 herkese açık sürüm notu.
