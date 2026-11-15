---
title: Dağıtım, yedek ve güncelleme
sidebar_position: 2
---

# Dağıtım, yedek ve güncelleme

## Docker

Çok aşamalı `Dockerfile` iki imaj üretir: **web** (`output: "standalone"`) ve ayrı **worker**. Konteyner
başlarken `prisma migrate deploy` çalışır; sağlık kontrolü `/api/health`.

- `UPLOAD_DIR` için **kalıcı volume** bağlayın.
- Worker'ı web ile aynı `DATABASE_URL` ve `AUTH_SECRET` ile çalıştırın.

Ayrıntılı adımlar (GitHub + Coolify): [Teknik belgeler → Dağıtım](/teknik/DEPLOYMENT_GITHUB_COOLIFY),
worker: [Otomasyon worker](/teknik/AUTOMATION_WORKER).

## Yedek

Üçü **birlikte** gereklidir:

1. Veritabanı: `pg_dump -Fc`
2. `UPLOAD_DIR` (yüklenen ve üretilen dosyalar)
3. `AUTH_SECRET` — şifreli kayıtlar ona bağlıdır; ayrı ve güvenli saklayın.

Geri yüklemede aynı `AUTH_SECRET` kullanılmazsa sağlayıcı anahtarları, e-imza kanıtları ve SEPA dosyaları
çözülemez.

## Güncelleme

1. Yedek alın.
2. Yeni sürümü dağıtın; migration'lar konteyner başlarken uygulanır.
3. **Ayarlar → Modül Yönetimi**'nde *onay bekleyen erişim* uyarısı varsa inceleyip onaylayın: bir modül yeni bir
   erişim isterse eski onay düşer ([Modül yönetimi](./modul-yonetimi)).
4. Modüllerin sürüm notları: [Modül kataloğu](/kullanim/moduller).
