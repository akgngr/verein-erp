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
| Sürüm | 1.5.7 |
| Sayfalar | `/mail`, `/mail/gelen-kutusu`, `/mail/kayitlar` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Bildirimler](./notifications) | yazma | Gelen kutusu ve sınıflandırma bildirimleri göndermek için. |
| [Muhasebe](./accounting) | yazma | Gelen fatura ve ekleri muhasebe fiş taslağı olarak aktarmak için. |
| [Evrak Kayıt](./documents) | yazma | Gelen kutusundaki e-posta ve eklerini Evrak Kayıt modülüne aktarmak için. |
| [Modül Yönetimi](./system) | okuma | Modül ayarları ve otomatik işleyiş durumunu okumak için. |
| [Görevler](./tasks) | yazma | Gelen e-postalardan görev taslağı oluşturmak için. |
| [Kullanıcılar](./users) | okuma | Bildirim alıcılarını ve işlem yapan kullanıcıları çözümlemek için. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Gelen kutusu | görüntüleme, oluşturma, düzenleme, silme | — | — | görüntüleme, oluşturma | — | — | — | — |
| E-posta altyapısı | görüntüleme, oluşturma, düzenleme | — | — | — | görüntüleme | — | — | — |

## Sürüm notları

### 1.5.7 — Evrak Kayıt aktarımı ve zamanlanmış IMAP alma

_2026-11-28_

- **Yeni:** Gelen kutusundaki e-postalar ekleriyle birlikte tek tıkla Evrak Kayıt'a aktarılabilir ve IMAP kutusu 15 dakikalık zamanlanmış görevle otomatik taranabilir.

### 1.5.6 — Ayar merkezi grubu

_2026-11-26_

- **İyileştirme:** Ayar sayfaları ayar merkezinde kendi grubunda ve sırasında gösterilir.

### 1.5.5 — E-posta eki MIME ve CSP sandbox sertleştirmesi

_2026-11-25_

- **Güvenlik:** Satır içi önizlenen e-posta ekleri güvenli MIME beyaz listesi ve CSP sandbox başlıkları ile sınırlandı (#573).

### 1.5.4 — Liste başlıkları ve dizin

_2026-11-25_

- **İyileştirme:** E-posta iletisi izinli List-Unsubscribe başlıklarını taşıyabilir; mail_logs (modül, referans) dizini eklendi.

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

Daha eski 14 herkese açık sürüm notu.
