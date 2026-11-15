---
title: Roller ve yetkiler
sidebar_position: 4
---

# Roller ve yetkiler

Yetkiler veritabanında tutulur ve **Ayarlar → Roller** ekranında yönetilir. Her modül kendi izinlerini
(görüntüleme, oluşturma, düzenleme, silme…) ve varsayılanlarını getirir.

## Hazır roller

| Rol | Tipik kullanım |
|---|---|
| Yönetici | Tüm yetkiler; kilitlidir, değiştirilemez |
| Yönetim Kurulu | Üye, toplantı, karar ve raporlar |
| Sekreter | Üye kayıtları, evrak, toplantılar |
| Sayman | Muhasebe, aidat ödemeleri, bağışlar |
| Denetçi | Mali kayıtları salt okur |
| Öğretmen | Kendi kursları, yoklama, notlar |
| Salt okunur | Yalnız görüntüleme |

## Özel roller

*Yeni rol* ile kendi rolünüzü oluşturup modül modül izin verebilirsiniz. Değiştirilen rol "Değiştirildi" olarak
işaretlenir; *Varsayılana dön* modüllerin varsayılanlarını geri yükler. Modüller kendi rollerini de getirebilir
(modül kapalıysa o rol atanamaz).

## Önemli ayrıntılar

- Yetki her istekte veritabanından yeniden okunur; rol değişikliği hemen geçerlidir.
- Bazı hassas alanların ayrı izni vardır (ör. üyelerde *Kimlik numaraları*, *Aidat ve ödemeler*).
- Asistan da **kullanıcının kendi yetkisiyle** çalışır; yetkiniz olmayan veriyi asistan da göremez.

Her modülün varsayılan yetki tablosu: [Modül kataloğu](/kullanim/moduller).
