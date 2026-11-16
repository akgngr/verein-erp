---
title: Verein ERP
slug: /
sidebar_position: 1
description: Almanya'daki dernekler ve küçük işletmeler için modüler yönetim sistemi.
---

# Verein ERP

Verein ERP; Almanya'daki dernekler (*eingetragene Vereine*) ve küçük işletmeler için **modüler monolit**
bir yönetim uygulamasıdır. Üyelik ve aidat, muhasebe (GoBD, DATEV, e-fatura), bağış, hibe, SEPA
otomatik ödeme, etkinlik, toplantı, kurs/öğrenci, kampanya, CRM, e-imza, evrak kayıt ve otomasyon tek
uygulamada toplanır. Her alan açılıp kapatılabilen ayrı bir **modüldür**.

- Arayüz **Türkçe ve Almanca**; resmî belgeler Almanca (isteğe bağlı Türkçe) üretilir.
- Kişisel veri **izne tabidir**: rol yetkileri, modüller arası onaylı erişim ve yapay zekâ için ayrı
  veri politikası katmanları vardır.
- Kendi sunucunuzda çalışır: Next.js 16, PostgreSQL, Prisma 7 ve pg-boss. Redis, Kubernetes veya ücretli
  servis gerektirmez.

## Bu belgeler kimin için?

| Bölüm | Kimin için | İçerik |
|---|---|---|
| [Kullanım](/kullanim/baslarken) | Dernek çalışanları, yönetim kurulu | Günlük kullanım, modül kataloğu, asistan, evrak |
| [Yönetim](/yonetim/kurulum) | Sistem yöneticisi | Kurulum, modül ve erişim onayları, roller, AI ayarları, yedek |
| [Geliştirici](/gelistirici/mimari) | Modül geliştiricileri | Mimari, modül sözleşmeleri, katı kurallar, testler |
| [Güvenlik](/guvenlik/veri-koruma) | Herkes, özellikle veri sorumlusu | Veri sınıfları, şifreleme, yapay zekâ gizliliği |
| [Teknik belgeler](/teknik/MODULE_DEVELOPMENT_GUIDE) | Geliştiriciler | Depodaki ayrıntılı şartname ve mimari belgeler |

## Temel ilkeler

1. **Sıfır bağımlılık, bildirilmiş bağ.** Modüller birbirine yalnız bildirdikleri ölçüde ve yönetici onayıyla
   bağlanır ([Modül sınırları](/gelistirici/modul-sinirlari)).
2. **Yetki her istekte veritabanından.** Her ekran ve işlem kullanıcının rolünü yeniden okur.
3. **Kişisel veri sızmaz.** Yapay zekâya giden her alan açıkça listelenir; kişi buluta yalnız takma adla gider
   ([Yapay zekâ gizliliği](/guvenlik/ai-gizlilik)).
4. **Denetlenebilirlik.** Tüm yazma işlemleri denetim kaydına geçer; muhasebe günlüğü zincirlidir (GoBD).
