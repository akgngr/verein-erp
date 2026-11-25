---
sidebar_position: 12
title: "E-posta Altyapısı"
description: "Tüm modüller için ortak e-posta gönderim altyapısı, SMTP ayarları ve gönderim kayıtları."
slug: /kullanim/moduller/mail
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Tüm modüller için ortak e-posta gönderim altyapısı, SMTP ayarları ve gönderim kayıtları.

| | |
|---|---|
| Anahtar | `mail` |
| Tür | Çekirdek (her zaman açık) |
| Sürüm | 1.5.4 |
| Sayfalar | `/mail`, `/mail/gelen-kutusu`, `/mail/kayitlar` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Bildirimler](./notifications) | yazma | Sınıflamaya rıza veren kullanıcılara yeni e-posta bildirimi gönderir (gönderen ve konu olmadan). |
| [Muhasebe](./accounting) | yazma | Gelen e-postalardaki fatura/belge eklerini muhasebe → gelen faturalar kutusuna aktarır. |
| [Modül Yönetimi](./system) | okuma | Muhasebe modülünün etkin olup olmadığını okur (aktarma düğmesi yalnızca etkinken gösterilir). |
| [Görevler](./tasks) | yazma | Sekreterin onaylı "görev taslağı" önerisinden görev oluşturur (yalnız kullanıcı onayıyla). |
| [Kullanıcılar](./users) | okuma | Görevdeki "oluşturan" etiketi için kullanıcının adını okur. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Gelen kutusu | görüntüleme, oluşturma, düzenleme, silme | — | — | görüntüleme, oluşturma | — | — | — | — |
| E-posta altyapısı | görüntüleme, oluşturma, düzenleme | — | — | — | görüntüleme | — | — | — |

## Sürüm notları

### 1.5.4 — E-posta eki MIME ve CSP sandbox sertleştirmesi

_2026-11-25_

- **Güvenlik:** Satır içi önizlenen e-posta ekleri güvenli MIME beyaz listesi ve CSP sandbox başlıkları ile sınırlandı (#573).

### 1.5.3 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 1.5.1 — Merkezi bildirimler

_2026-11-20_

- **Yeni:** Sınıflamaya rıza veren kullanıcılar, öneri yapılabilecek yeni e-postalar için bildirim alır (gönderen ve konu olmadan).

### 1.5.0 — Sekreter: gelen posta sınıflaması ve taslaklar

_2026-11-19_

- **Yeni:** Yönetici açarsa gelen e-postalar yalnız konu satırı ve ek türüne göre yerel kurallarla sınıflanır (fatura, toplantı, üyelik, bağış, soru). Gövde okunmaz, harici yapay zekâya veri gitmez.
- **Yeni:** Rıza veren kullanıcıya sekreter yanıt taslağı veya görev önerir. Taslak boş açılır; e-posta yalnız metni yazıp ayrıca "Gönder" dediğinizde gider.
- **Yeni:** Otomasyonlar için yeni olay: "Gelen kutusuna e-posta geldiğinde" (yalnız kimlik, kaynak, ek sayısı ve sınıf).
- **Güvenlik:** Taslak metni şifreli saklanır, gönderimden sonra silinir; rıza geri alınınca açık taslaklar da silinir.

### 1.4.5 — Kod bakımı

_2026-11-19_

- **İyileştirme:** Kullanılmayan kod temizlendi; formlar alan değişikliklerini React Compiler ile uyumlu şekilde izliyor. Görünüm ve davranış değişmedi.

### 1.4.4 — Arayüz altyapısı

_2026-11-18_

- **İyileştirme:** Düğme ve bağlantılar ortak arayüz kitine taşındı. Görünüm ve davranış değişmedi.

### 1.4.2 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

### 1.4.1 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

Daha eski 11 herkese açık sürüm notu.
