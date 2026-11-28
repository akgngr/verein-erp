---
sidebar_position: 44
title: "Üyeler"
description: "Üye kayıtları, üyelik tipleri, aidat tahakkuk ve ödeme takibi."
slug: /kullanim/moduller/members
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Üye kayıtları, üyelik tipleri, aidat tahakkuk ve ödeme takibi.

| | |
|---|---|
| Anahtar | `members` |
| Tür | Resmî modül |
| Sürüm | 1.16.2 |
| Sayfalar | `/uyeler`, `/uyeler/aidat`, `/uyeler/turler`, `/toplu-eposta?kaynak=members:members`, `/uyeler/ice-aktar` |
| Önerir | [e-Sign](./online-forms) |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Dernek Bilgileri](./organization) | okuma | Makbuz ve belgelerde dernek antetini kullanır. |
| [e-Sign](./online-forms) | okuma, yazma | Üye sayfasından e-imza/uzaktan form bağlantısı göndermek, imzalı belgeleri göstermek ve üye silindiğinde bekleyen davetleri iptal etmek için. |
| [Üye Portalı](./member-portal) | okuma, yazma | Üye silindiğinde o üyeye ait aktif üye portalı oturumlarını iptal eder. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Kimlik numaraları | görüntüleme | görüntüleme | görüntüleme | — | — | — | — | — |
| Aidat ve Ödemeler | görüntüleme, oluşturma, düzenleme, silme | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme | — | — | — |
| Üyelik Tipleri | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme | görüntüleme | görüntüleme | — | — | görüntüleme |
| Üye Kayıtları | görüntüleme, oluşturma, düzenleme, silme | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme | görüntüleme | — | — | görüntüleme |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`create_dataset` · `create_dues_dataset` · `get_member_profile` · `get_member_statistics` · `list_dues_by_person` · `query_dataset`

## Sürüm notları

### 1.16.2 — Üyelik belgesi ve üye kartı PDF çıktısı

_2026-11-28_

- **Yeni:** Üye detay sayfasından iki dilli (TR/DE) Üyelik Belgesi ve Üye Kartı PDF'i indirme özelliği eklendi.
- **Düzeltme:** Belgedeki üyelik türü gerçek türlere (Asıl, Onursal, Fahri, Destekçi) göre yazılır; giriş cümlesi türden bağımsızdır, onursal veya destekçi üye 'asıl üye' olarak belgelenmez.

### 1.16.1 — Banka eşleştirme aidat sözleşmesi (#616)

_2026-11-26_

- **Yeni:** Muhasebe banka ekstre eşleştirmesi için açık aidat listeleme ve tek işlemde atomik aidat tahsilatı kaydetme sunucu sözleşmesi eklendi.

### 1.16.0 — Katılım tarihi esaslı sayılar, doğum günleri ve yıldönümleri

_2026-11-26_

- **Düzeltme:** "Bu ay yeni" sayısı üyelik başlangıcına (katılım tarihi) göre hesaplanır; toplu içe aktarma veya geç kayıt sayıyı artık şişirmez.
- **İyileştirme:** Yeni üyelik numaralarındaki yıl katılım yılıdır (ör. 1998'de katılan üye UYE-1998-…). Mevcut numaralar değişmez.
- **Yeni:** Panelde yeni kart: önümüzdeki 30 gündeki doğum günleri ve 10/25/40/50/60. üyelik yılları (yalnız etkin/pasif üyeler; üye düzenleme yetkisi olanlar görür).

### 1.15.11 — Aidat korumaları, DSGVO dışa aktarım, silme temizliği ve düzeltme talebi paneli

_2026-11-25_

- **Düzeltme:** Aidat fazla ödeme/işlem içi koruma, makbuz PDF tutarı ve denetim kaydı, mükerrer üye uyarısı, tam DSGVO dışa aktarımı, toplu içe aktarma tekilleştirme, silmede SEPA/portal temizliği ve üye düzeltme talebi onay paneli eklendi (#578, #577).

### 1.15.10 — Arayüz düzeltmeleri (#586)

_2026-11-25_

- **Düzeltme:** Aidat ödemeleri başlığı Türkçe arayüzde büyük harfe çevrilmez ("MİTGLİEDSBEİTRÄGE" hatası).

### 1.15.9 — Portal ve form için SEPA API'si

_2026-11-25_

- **İyileştirme:** Maskeli IBAN ve SEPA yetkisi kaydı üye portalı ve çevrimiçi formlar için public API'den sunulur.

### 1.15.8 — Kanal rızası eşitlemesi

_2026-11-25_

- **Güvenlik:** Telegram /start ve /stop ile tek tıkla e-posta çıkışı üyenin rızasını ve toplu e-posta itirazını günceller.

### 1.15.7 — nav.json kategori ve alt modül tanımı

_2026-11-24_

- **İyileştirme:** Kullanıcı bazlı sol menü gruplama ve alt modül hiyerarşisi için nav.json eklendi.

Daha eski 39 herkese açık sürüm notu.
