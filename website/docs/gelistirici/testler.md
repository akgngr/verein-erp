---
title: Testler ve CI
sidebar_position: 5
---

# Testler ve CI

CI her PR'da aynı adımları çalıştırır:

```bash
pnpm module:sync                                  # köprüler, şema, çeviri, kayıt
pnpm module:validate                              # modül standardı + çeviri bütünlüğü + migration
pnpm exec tsx scripts/check-i18n-keys.ts          # kullanılan her anahtar tr/de'de var
pnpm exec tsx scripts/check-hardcoded-text.ts     # arayüzde sabit metin yok
pnpm exec tsx scripts/check-module-versions.ts    # değişen modülün sürümü arttı mı
pnpm typecheck && pnpm lint && pnpm test
```

Ek olarak CodeQL, gitleaks (sır taraması) ve bağımlılık denetimi çalışır.

## Önemli koruyucu testler

| Test | Korur |
|---|---|
| `tests/modules/module-boundaries.test.ts` | Modüller arası bildirilmemiş bağ ([kural](./modul-sinirlari)) |
| `tests/ai/ai-contract-v2-only.test.ts` | Asistan araçları yalnız v2 + veri sınıfı ([kural](./ai-araclari)) |
| `tests/shared/data-policy.test.ts` | Asistanın okuduğu tablolar ve hassas alanlar |
| `tests/modules/access.test.ts` | Erişim onayı kuralları |
| `tests/docs/module-docs.test.ts` | Dokümantasyondaki modül kataloğu güncel mi |
| `zero-touch`, `navigation`, `scaffold` | Elle yazılmış `src/app`, sayfasız menü, iskelet uyumu |

## Test yazarken

- Testler `NODE_OPTIONS="--conditions=react-server" tsx --test` ile koşar; dosyalar paralel çalışır, **paylaşılan
  ayarları değiştirmeyin** (bağımlılıkları enjekte edin).
- Veritabanı testleri `AI_TEST_DATABASE_URL` ile açılır (CI'da yalıtılmış veritabanı).
