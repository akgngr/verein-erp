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
| Sürüm | 1.2.8 |
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

### 1.2.8 — TAX_ADVISOR rolü izin tanımı

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

### 1.2.3 — Doğum tarihi seçimi ortak SelectField katmanında

_2026-11-17_

- **İyileştirme:** Gün/ay/yıl doğum tarihi seçimleri ortak SelectField adapterına taşındı; doğrudan HeroUI Select/ListBox/Label bağımlılığı kaldırıldı.

### 1.2.2 — İmza temizleme eylemi ortak buton katmanında

_2026-11-17_

- **İyileştirme:** Buton görünümü ve etkileşim semantiği ortak ActionButton pattern'ine taşındı; modül bu kullanımda HeroUI Button implementasyonuna doğrudan bağlı değil.

### 1.2.1 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 1.2.0 — Çoklu form belgeleri ve Word benzeri editör

_2026-11-07_

- **Yeni:** Sabit iki metin alanı yerine istenen sayıda belge (Datenschutz, fotoğraf izni, kurallar vb.) eklenebilir; sıralanabilir, form türüne göre gösterilir, onay kutusu isteğe bağlı/zorunlu seçilebilir.
- **Yeni:** Belgeler tam ekran modalda Tiptap tabanlı Word benzeri editörle düzenlenir (başlıklar, listeler, hizalama, tablo, bağlantı). HTML sunucuda temizlenir.
- **İyileştirme:** İmzalı PDF ve kanıt kaydı her belgenin metnini ve onay durumunu içerir. Eski metinler belgelere taşındı.

Daha eski 3 herkese açık sürüm notu.
