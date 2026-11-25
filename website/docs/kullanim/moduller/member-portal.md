---
sidebar_position: 41
title: "Üye Portalı"
description: "Parolasız sihirli bağlantı ve geçiş anahtarı ile üye self-servis portalı."
slug: /kullanim/moduller/member-portal
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Parolasız sihirli bağlantı ve geçiş anahtarı ile üye self-servis portalı.

| | |
|---|---|
| Anahtar | `member-portal` |
| Tür | Eklenti |
| Sürüm | 0.4.0 |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Üyeler](./members) | okuma, yazma | Üyenin kendi ana verilerini salt okunur göstermek, düzeltme talebi kuyruğu ve rıza yönetimi için kullanılır. |
| [Bağışlar](./donations) | okuma | Üyenin kendi bağış makbuzlarını (Zuwendungsbestätigung) PDF olarak indirmesi için kullanılır. |
| [Öğrenciler](./students) | okuma | Veli bağlantılı öğrenci bilgilerini göstermek için kullanılır. |
| [E-posta Altyapısı](./mail) | yazma | Tek kullanımlık sihirli giriş bağlantısı ve çift onaylı rıza bağlantısı göndermek için kullanılır. |
| [Dosyalarım](./exports) | okuma, yazma | DSGVO Md. 15 şifreli veri dışa aktarımı oluşturmak ve indirmek için kullanılır. |
| [Denetim Kayıtları](./audit) | okuma | Üyenin kendi verilerine ait işleme günlüğünü kişi adı olmadan göstermek için kullanılır. |
| [Etkinlikler](./events) | okuma, yazma | Business+ lisansıyla etkinliklere kayıt olmak için kullanılır. |
| [e-Sign](./online-forms) | okuma, yazma | Business+ lisansıyla bekleyen belgeleri imzalamak için kullanılır. |
| [Modül Yönetimi](./system) | okuma | Business+ lisans durumunu doğrulamak için kullanılır. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Üye Portalı Yönetimi | görüntüleme, düzenleme | görüntüleme | — | — | — | — | — | — |

## Sürüm notları

### 0.4.0 — Portal uçtan uca çalışır, ek doğrulama, güvenlik

_2026-11-25_

- **Düzeltme:** Portal öznesi tek biçimde ('member:&lt;id>'); önceden her gerçek oturumda rıza, düzeltme, makbuz, Art. 15, etkinlik ve imza işlemleri başarısız oluyordu. Giriş bağlantısı tam e-posta eşleşmesiyle bulunur; ana veride gerçek maskeli IBAN gösterilir.
- **Güvenlik:** E-postayla ek doğrulama (step-up) eklendi; doğrulamasız geçiş anahtarı yolu kapatıldı. Rıza onayı yalnız sayfadaki düğmeyle (POST) yapılır; tüm portal uçlarında hız sınırı; __Host- çerezleri doğru silinir; makbuz imza anahtarında sabit yedek değer kaldırıldı.
- **Düzeltme:** Portal içi imza, tam akış bağlanana kadar kapalı; bekleyen formlar e-postadaki bağlantıyla (belge, imza, kanıt, PDF) imzalanır.

### 0.3.2 — İşlem günlüğünde ödemeler

_2026-11-25_

- **Düzeltme:** İşlem günlüğü ve Art. 15 dışa aktarımı yönetimin kaydettiği ödemeleri de içerir.

### 0.3.1 — Portal CSP nonce, SameSite=Strict oturum ve Secure __Host- çerezleri

_2026-11-24_

- **Güvenlik:** İstek başına CSP nonce + x-nonce başlığı, __Host-portal-session için SameSite=Strict ve tüm __Host- çerezleri için daima Secure=true eklendi.

### 0.3.0 — Veri hakları (Md. 15), işleme günlüğü ve Business+ özellikleri (P3)

_2026-11-24_

- **Yeni:** Step-up korumalı DSGVO Md. 15 şifreli dışa aktarım, kişi adı içermeyen işleme günlüğü ve lisans kapılı Business+ etkinlik kaydı ile belge imzalama eklendi.

### 0.2.0 — Self-servis: düzeltme kuyruğu, rızalar ve makbuzlar (P2)

_2026-11-24_

- **Yeni:** Yönetim kurulu onay kuyruklu veri düzeltme önerileri, anında geri çekme + çift onaylı rıza yönetimi ve step-up korumalı imzalı PDF makbuz indirme eklendi.

### 0.1.0 — Parolasız üye portalı çekirdeği (P1)

_2026-11-23_

- **Yeni:** Sihirli bağlantı (15 dk, POST onaylı, nonce bağlı), oturum yönetimi (15 dk boşta / 8 sa mutlak / en fazla 3), WebAuthn passkey step-up ve salt okunur üye ana verisi eklendi.
