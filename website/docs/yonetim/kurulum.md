---
title: Kurulum
sidebar_position: 1
---

# Kurulum

## Gereksinimler

- Node.js ≥ 22.12 ve pnpm
- PostgreSQL 16+
- (Üretim) Docker veya Coolify gibi bir konteyner platformu; yüklenen dosyalar için kalıcı disk

## Yerel kurulum

```bash
createdb dernek
cp .env.example .env            # değerleri doldurun (aşağıda)
pnpm install
pnpm db:migrate                 # şema + migration geçmişi
pnpm db:seed                    # ilk yönetici (idempotent)
pnpm dev                        # http://localhost:3000
```

Arka plan işleri (kampanya gönderimi, e-imza PDF'i, zamanlanmış görevler, takvim senkronu) için ayrı terminal:

```bash
pnpm automation:worker
```

`pnpm dev:full` web sunucusunu ve worker'ı birlikte başlatır.

## Ortam değişkenleri

| Değişken | Açıklama |
|---|---|
| `DATABASE_URL` | PostgreSQL bağlantısı. Havuzlu sunucuda ayrıca `DIRECT_URL` (migration için). |
| `AUTH_SECRET` | `openssl rand -base64 32`. Veritabanındaki sırlar bundan türetilen anahtarla şifrelenir; **değişirse bu kayıtlar çözülemez**. |
| `AUTH_TRUST_HOST` | Sunucu dağıtımında `true`. |
| `APP_URL` | İsteğe bağlı. Uygulamanın herkese açık adresi (ör. `https://erp.ornek.de`). E-postalardaki bağlantılar için gerekir; tanımlı değilse sekreterin günlük özet e-postası gönderilmez. |
| `AUTOMATION_ENABLED`, `AUTOMATION_WORKER_ENABLED` | Otomasyon ve worker. |
| `UPLOAD_DIR`, `MAX_UPLOAD_MB` | Yüklenen dosyalar (üretimde kalıcı volume) ve dosya başına sınır. |
| `ORGANIZATION_NAME` | Dernek bilgileri girilene kadar kullanılan ad. |
| `DOCUMENT_LANGUAGE` | Resmî PDF'lerin varsayılan dili: `de` (varsayılan) veya `tr`. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | İlk yönetici (seed). |
| `OCR_LANG_DIR` | (İsteğe bağlı) OCR dil dosyalarının klasörü; varsayılan paketle gelen dosyalar. |

Eksik veya geçersiz değişkende uygulama açıklayıcı hatayla durur (`src/shared/env.ts`).

:::info Sırlar ortam değişkeninde değil
SMTP, SMS/WhatsApp/Telegram sağlayıcıları, banka bağlantısı ve yapay zekâ API anahtarları uygulama içindeki ayar
ekranlarından girilir ve veritabanında **şifreli** saklanır.
:::

## Komutlar

| Komut | Açıklama |
|---|---|
| `pnpm dev` / `pnpm dev:full` | Geliştirme sunucusu (+ worker) |
| `pnpm build` / `pnpm start` | Üretim derlemesi ve sunucu |
| `pnpm automation:worker` | Arka plan iş işleyicisi |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Denetimler ve testler |
| `pnpm module:sync` | Modül şemaları, rota köprüleri, kayıt dosyaları ve çeviriler |
| `pnpm db:migrate` / `pnpm db:deploy` / `pnpm db:verify` | Migration üretimi, uygulanması, bütünlük kontrolü |
