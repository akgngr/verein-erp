---
title: Bu belgeleri güncellemek
sidebar_position: 6
---

# Bu belgeleri güncellemek

Site [Docusaurus 3.10](https://docusaurus.io/) ile `website/` klasöründedir ve `main`'e her birleştirmede GitHub
Pages'e yayınlanır (`.github/workflows/docs.yml`).

| Kaynak | Nerede | Nasıl |
|---|---|---|
| Kullanım/yönetim/geliştirici sayfaları | `website/docs/**` | Elle |
| Modül kataloğu | `website/docs/kullanim/moduller/` | **Üretilir:** `pnpm docs:modules` |
| Teknik belgeler | depodaki `docs/` | Olduğu gibi yayınlanır (kopyalanmaz) |

## Kurallar

- Bir modülün açıklaması, sürümü, yetkileri, erişimleri veya sürüm notu değişince `pnpm docs:modules` çalıştırın;
  `tests/docs/module-docs.test.ts` katalog güncel değilse CI'ı kırar.
- Yeni bir katı kural eklendiğinde ilgili geliştirici sayfasını ve `docs/MODULE_DEVELOPMENT_GUIDE*.md`'yi birlikte
  güncelleyin.
- Belgelerde gerçek kişi verisi, sır veya iç sunucu adresi kullanmayın; örneklerde uydurma veriler kullanın.

## Yerelde

```bash
pnpm docs:modules
cd website && npm ci && npm start      # http://localhost:3000/verein-erp/
npm run build                          # kırık bağlantıda derleme durur
```
