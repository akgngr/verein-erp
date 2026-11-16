---
title: Mimari
sidebar_position: 1
---

# Mimari

Verein ERP bir **modüler monolittir**: tek Next.js uygulaması ve tek PostgreSQL veritabanı; iş alanları ise
birbirinden yalıtılmış modüllerdir.

**Teknoloji:** Next.js 16 (App Router) · TypeScript · Prisma 7 + PostgreSQL · Auth.js v5 · HeroUI ·
pg-boss · next-intl · @react-pdf · Zod.

## Katmanlar

```text
src/
├── shared/          domain bilmeyen altyapı (hiçbir modülü import edemez)
│   ├── permissions/ yetki motoru         ├── ai/        asistan sözleşmeleri (v2)
│   ├── db, env      veritabanı, ortam     ├── data-policy.ts  tablo veri sınıfları (K0–K3)
│   └── …            DataTable, form, PDF, şifreleme, denetim kaydı
├── modules/<m>/     her iş alanı: şema, yetki, servis, action, ekran, çeviri, sürüm notu
├── app/             pnpm module:sync ile ÜRETİLİR (elle düzenlenmez)
└── *-registry.ts    pnpm module:sync ile ÜRETİLİR
```

## Modül anatomisi

```text
src/modules/sponsors/
├── module.config.ts   anahtar, sürüm, menü, access/requires/recommends
├── schema.prisma      modülün tabloları (modüller arası FK yok)
├── permissions.ts     izinler ve rol varsayılanları
├── server.ts          diğer modüllere açık sunucu API'si
├── automation.ts      worker-güvenli girişler (görev/olay)
├── ai.ts              asistan araçları (yalnız v2)
├── actions/ services/ queries/ views/ components/ routes/ api/
├── messages/tr.json, de.json
└── releases.json
```

Dosya adıyla otomatik keşfedilen sözleşmeler: `page.tsx` + `routes/`, `api/`, `public/`, `automation.ts`,
`calendar.ts`, `channels.ts`, `recipients.ts`, `ai.ts`, `lifecycle.ts`, `cards/`, `demo.ts`, `formats.ts`.

## İstek akışı

1. Üretilen rota köprüsü modül görünümünü `withModuleGate` ile sarar: modül açık mı, erişim onaylı mı?
2. Görünüm `requirePermission` ile kullanıcıyı ve yetkisini **veritabanından** okur.
3. Yazma işlemleri `createAction` ile: yetki, Zod doğrulaması, denetim kaydı.
4. Başka modülün verisi yalnız `@/modules/<m>/server` üzerinden ve `access` bildirimiyle.

## Arka plan işleri

pg-boss kuyruğu ve ayrı worker süreci: kampanya gönderimi, e-imza PDF'i, takvim senkronu, zamanlanmış görevler,
iş akışları. Ayrıntı: [Otomasyon motoru](/teknik/AUTOMATION_ENGINE).
