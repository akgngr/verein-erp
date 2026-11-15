---
title: Modül yönetimi ve erişim onayları
sidebar_position: 3
---

# Modül yönetimi ve erişim onayları

**Ayarlar → Modül Yönetimi** ekranında modülleri açar, kapatır, sürümlerini ve sürüm notlarını görürsünüz.

## Modül türleri

| Tür | Açıklama |
|---|---|
| Çekirdek (CORE) | Her zaman açık (kullanıcılar, denetim kaydı, dosyalarım…) |
| Resmî (OFFICIAL) | Proje ile gelen modüller |
| Eklenti (EXTENSION) | Ek kanallar, takvim sağlayıcıları, otomasyon gibi isteğe bağlı modüller; `.vmod` imzalı paketlerle de yüklenebilir |

## Bağımlılıklar

- **Gerektirir (`requires`):** modül bunlar olmadan çalışmaz. Açarken eksikler birlikte açılır; bunlardan biri
  kapatılırsa bu modül de (onayla) kapanır.
- **Önerir (`recommends`):** onsuz çalışır ama bazı düğmeler/bağlantılar görünmez (ör. Evrak → "Muhasebeye aktar"
  yalnız Muhasebe açıksa).

## Erişim onayı

Bir modül başka bir modülün verisine ya da sayfasına bağlanıyorsa bunu **bildirir** ve siz onaylarsınız.
Onay penceresinde her erişim için *hangi modül*, *hangi işlem* (okuma/yazma/silme) ve *neden* yazar.

- Onay verilmezse modül kullanılamaz: menüde görünmez, sayfaları ve API'leri kapalıdır.
- Resmî modüller ilk kurulumda onaylı gelir; eklentiler onay bekler.
- Modül güncellenip **yeni bir erişim isterse** eski onay düşer ve yeniden istenir. Bu, bir güncellemenin
  sessizce yeni veriye erişmesini engeller.
- Onaylar geri alınabilir; geri alınca modül kapanır.

Her modülün istediği erişimler ve gerekçeleri: [Modül kataloğu](/kullanim/moduller) → modül sayfası →
*Diğer modüllere erişim*.
