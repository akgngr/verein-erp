---
title: Modül geliştirme
sidebar_position: 2
---

# Modül geliştirme

## Hızlı başlangıç

```bash
pnpm module:create sponsors "Sponsorlar" "Sponsoren"
pnpm db:migrate --name add_sponsors
pnpm dev                       # → /sponsors
```

İskelet tüm kurallara uyan, çalışan bir modül üretir (liste, sağ çekmece form, yetkiler, çeviriler, sürüm notu).

## Kontrol listesi

- [ ] `module.config.ts`: `version` arttı, `releases.json` en üstünde aynı sürüm (TR + DE notlar)
- [ ] Arayüzde sabit metin yok; tüm metinler `messages/tr.json` + `de.json`
- [ ] Yazma işlemleri `createAction` ile; her görünüm `requirePermission`
- [ ] Başka modüle her bağ bildirildi ([Modül sınırları](./modul-sinirlari))
- [ ] Asistan araçları yalnız `aiToolV2` ([Asistan araçları](./ai-araclari))
- [ ] `pnpm module:sync` çalıştırıldı; `src/app` elle düzenlenmedi
- [ ] Denetimler geçti ([Testler ve CI](./testler))

Tam rehber (tüm bölümler, örnekler): [MODULE_DEVELOPMENT_GUIDE](/teknik/MODULE_DEVELOPMENT_GUIDE)
([English](/teknik/MODULE_DEVELOPMENT_GUIDE_EN)). Depoya erişimi olmayan bir yapay zekâya modül yazdırmak için:
[AI_MODULE_PROMPT](/teknik/AI_MODULE_PROMPT).
