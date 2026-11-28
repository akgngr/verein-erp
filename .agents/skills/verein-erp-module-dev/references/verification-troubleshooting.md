# Doğrulama Kapısı, Sürümleme, `.vmod` Paketleme ve Hata→Çözüm Rehberi

## 1. Tam Doğrulama Sırası (CI ile Birebir Aynı)

Modül geliştirmesini veya değişikliğini bitirmeden önce sırayla çalıştır:

```bash
# 1. Tüm köprüleri, registry'leri, Prisma şemasını, çevirileri, nav defaults'u ve modül dokümantasyon kataloğunu üret
pnpm module:sync
pnpm docs:modules

# 2. Prisma client + şema doğrulama
pnpm exec prisma generate
pnpm exec prisma validate

# 3. (Şema değiştiyse) Migration üret + bütünlüğü + drift'i doğrula
pnpm db:migrate --name add_<anahtar>
# Veritabanına uygulanabildiğini ve drift olmadığını doğrula:
# pnpm db:deploy
# pnpm exec prisma migrate diff --from-migrations prisma/schema/migrations --to-schema prisma/schema --exit-code

# 4. Modül standardı ve ek paket bağımlılıkları
pnpm module:validate
pnpm module:deps --check

# 5. Çeviri anahtarları (ICU dahil) + sabit UI metni denetimi
pnpm exec tsx scripts/check-i18n-keys.ts
pnpm exec tsx scripts/check-hardcoded-text.ts

# 6. Modül sürüm artışı denetimi (origin/main veya BASE_REF'e göre)
pnpm exec tsx scripts/check-module-versions.ts

# 7. Typecheck (önce eski .next/types temizler), Lint ve Testler
pnpm typecheck
pnpm lint
pnpm test

# 8. Üretim derlemesi (yeni rota / büyük UI değişikliğinde)
pnpm build
```

> **CI Drift Kontrolü:** CI `pnpm module:sync` sonrası `git diff --exit-code` çalıştırır ve `tests/docs/module-docs.test.ts` `website/docs/kullanim/moduller/` kataloğunun güncel olmasını zorunlu tutar. Üretilen tüm dosyaları (`src/*-registry.ts`, `src/app/(dashboard)/(modules)/**`, `src/app/api/(modules)/**`, `src/app/(public)/(modules)/**`, `messages/{tr,de}.json`, `prisma/schema/<anahtar>.prisma`, `src/shared/navigation/nav-defaults.generated.ts`, `website/docs/kullanim/moduller/**`) mutlaka commit'le!
>
> **Dal Yükseltme (Branch Promotion) Kuralı (`scripts/check-promotion.mjs`):** PR'lar doğrudan `main`'e açılamaz; akış **`feature/<ad>` (veya `agent/`, `docs/`, `chore/`, `fix/`) → `alpha` → `beta` → `main`** şeklindedir.

### Odaklı Hızlı Test Komutları
```bash
pnpm test:modules    # module-boundaries, access, dependencies, standard, releases, egress-ledger
pnpm test:shared     # data-policy, user-deletion, zero-touch, ui-platform-contract, navigation, directives, i18n, scaffold
pnpm test:security   # permission-registry-integrity, permission-surface-inventory, rbac-isolation
pnpm test:ai         # ai-contract-v2-only, v2-contract
pnpm test:automation # module-events, worker contracts
NODE_OPTIONS="--conditions=react-server" pnpm exec tsx --test tests/docs/module-docs.test.ts
```

### Offline / Ağ Kısıtlı Ortamda Migration
`pnpm db:migrate`, `.env` içindeki `DATABASE_URL`'e bağlanabilmelidir (uzak DB erişilemiyorsa `P1001`). Ağ kısıtlı ortamda:
```bash
docker run --rm -d --name verein-pg -e POSTGRES_USER=verein -e POSTGRES_PASSWORD=verein -e POSTGRES_DB=verein_dev -p 5432:5432 postgres:17
# Postgres ilk initdb restart'ı bittikten sonra gölge DB oluştur:
for i in $(seq 1 20); do docker exec verein-pg pg_isready -h 127.0.0.1 -U verein && break; sleep 1; done
docker exec verein-pg psql -h 127.0.0.1 -U verein -d verein_dev -c "CREATE DATABASE verein_shadow;"
DATABASE_URL="postgresql://verein:verein@127.0.0.1:5432/verein_dev" \
SHADOW_DATABASE_URL="postgresql://verein:verein@127.0.0.1:5432/verein_shadow" \
pnpm db:migrate --name add_<anahtar>
```
Asla elle `migration.sql` yazma ve asla `prisma db push` ile geçiştirme (CI `prisma migrate diff --from-migrations prisma/schema/migrations --to-schema prisma/schema --exit-code` ile yakalar).

> **Migration Zaman Damgası Sıralaması Notu:** `prisma/schema/migrations/` altındaki bazı geçmiş migration'lar ileri tarihli zaman damgası (ör. `20270116...`) taşıyabilir. Yeni bir bağımsız tablo ekleyen migration bundan etkilenmez, ancak mevcut bir `2027*` tablosunu `ALTER TABLE` ile değiştiren bir migration yerel saatle daha erken bir klasör adına yazılırsa temiz DB'de sözlük sırası yüzünden erken çalışıp hata verebilir. Bunu hemen yakalamak için mutlaka `SHADOW_DATABASE_URL` ile `prisma migrate diff --from-migrations prisma/schema/migrations --to-schema prisma/schema --exit-code` çalıştır!

---

## 2. `releases.json` Sürümleme Kuralı

Modülde tek bir dosya bile değiştiğinde `releases.json` dizisinin **en üstüne** yeni sürüm ekle ve `module.config.ts → version` ile eşitle:

```json
{
  "releases": [
    {
      "version": "1.1.0",
      "date": "2026-11-27",
      "title": { "tr": "Özet başlık", "de": "Kurztitel" },
      "changes": [
        { "type": "feature", "tr": "Yeni özellik açıklaması.", "de": "Beschreibung der neuen Funktion." }
      ]
    }
  ]
}
```
- `type` değerleri: `"feature" | "improvement" | "fix" | "security" | "internal"` (`internal` kullanıcı ekranında gizlenir ama sürüm zincirinde zorunludur).
- Semver: yeni özellik → minor (`1.0.0 → 1.1.0`), hata düzeltme → patch (`1.1.0 → 1.1.1`), kırıcı değişiklik → major (`1.1.1 → 2.0.0`).
- Sürümler kesinlikle yeniden eskiye (azalan) sıralı olmalıdır.

---

## 3. İmzalı Modül Paketleme (`.vmod`)

```bash
pnpm module:keygen <yayinci>
pnpm module:pack <anahtar> --key <yayinci>.private.pem --publisher <yayinci> [--migration <klasor>]...
pnpm module:install <dosya.vmod>
pnpm db:deploy && pnpm build
```
- Güvenilen yayıncılar: `src/config/trusted-publishers.json` (`official: true` değilse yalnız `EXTENSION` paketleyebilir).
- Yalnız daha yüksek sürüm kurulur; hata olursa `.module-backups/` üzerinden geri alınır.

---

## 4. Hata → Anında Çözüm Tablosu

| Hata / Test Kırığı | Neden | Çözüm |
|---|---|---|
| `dokümantasyon modül kataloğu güncel (pnpm docs:modules)` (`tests/docs/module-docs.test.ts`) | Yeni modül eklendi veya `version`/`releases.json`/`description`/`permissions`/`access` değişti | `pnpm docs:modules` çalıştır ve `website/docs/kullanim/moduller/` çıktısını commit'le |
| `ERP UI platform: modules must import shared UI patterns instead of @heroui/react (W6)` | Modül içinde doğrudan `@heroui/react` import edilmiş | `@/shared/components/kit`, `@/shared/components/fields`, `@/shared/components/forms/*` veya `@/shared/components/ui/*` kullan |
| `Use CardHeader/CardContent/... in server components` | `"use client"` olmayan dosyada `<Card.Header>` / `<Tabs.Tab>` vb. kullanılmış | Ayrı exportları (`CardHeader`, `CardContent`, `CardFooter`) kullan veya bileşeni `components/` altına `"use client"` olarak taşı |
| `Do not use Next.js <Link> for /api/ routes` | `<Link href="/api/...">` yazılmış | `<a href="/api/..." download>` veya `<LinkButton href="/api/..." download>` kullan |
| `add these tables to src/shared/data-policy.ts` | Yeni Prisma modeli `DATA_POLICY` içinde yok | `src/shared/data-policy.ts → DATA_POLICY` içine `{ owner, category, reason, sensitiveFields }` ekle |
| `Set personalOwnerField in DATA_POLICY or add the table to USER_LINK_RETAINED` | Modelde `userId`/`ownerId` var ama silinme kararı yok | Kişisel veriyse `personalOwnerField` + `lifecycle.ts → onUserDeleted` (`deleteMany`); kurumsalsa `USER_LINK_RETAINED`'a ekle |
| `Bildirilmemiş modüller arası bağ: A → B [import\|api\|page]` | Başka modüle import, `/api/B` veya `/B-sayfasi` referansı bildirilmemiş | `module.config.ts` içine `access` (ve `messages/{tr,de}.json → access.B`) veya sayfa linki için `recommends`/`requires` ekle |
| `Tablo "..." için migration bulunamadı` veya CI `migration-drift.sql` | `schema.prisma` değişti ama migration yok | `pnpm db:migrate --name <ad>` çalıştır (`db push` kullanma) |
| `yetki rol adına göre denetleniyor; can(user.role, …) kullanın` | `user.role === "ADMIN"` / `ROLES.includes(role)` yazılmış | `can(user.role, myPermissions, "action")` veya ayrı scope izni tanımla |
| `çıplak fetch(...) — dış istekler sunucuda channelFetch ile yapılmalı` | Modülde harici URL'ye `fetch(...)` çağrısı var | Sunucuda `channelFetch(allowedHosts, url)` (`@/shared/campaigns/channel`) kullan; istemcide yalnız göreli `"/api/..."` |
| `ai.ts defineModuleAiV2 ile tanımlanmalı` / `AI tool ... is not declared in AI_TOOL_POLICY` | Legacy v1 `aiTool` veya `AI_TOOL_POLICY` eksik | `defineModuleAiV2` + `aiToolV2` kullan ve aracı `src/shared/data-policy.ts → AI_TOOL_POLICY`'ye ekle |
| `check-hardcoded-text` bulgusu (`jsx-text`, `prop`, `object`, `validation`) | Kodda düz metin veya enum etiketi var | Metni `messages/{tr,de}.json`'a taşı; Zod/`ActionError` için anahtar ver; gerçekten sabit teknik/model metniyse `// i18n-ignore` ekle |
| `[i18n-keys] missing` veya `invalid ICU message` | Anahtar `tr`/`de`'de yok, `module:sync` çalıştırılmamış veya mesajda `<...>` var | `messages/{tr,de}.json`'ı eşitle, `<...>` yerine `{var}` yaz ve `pnpm module:sync` çalıştır |
| `modül değişti ama sürümü artmadı` (`check-module-versions.ts`) | Modülde değişiklik var ama `releases.json` güncellenmemiş | `releases.json` en üste yeni sürüm ekle ve `module.config.ts → version` ile eşitle |
| `TS2322` (`zodResolver` ↔ `useForm`) | Zod şemasında `z.preprocess` veya `.default()` var | `resolver: zodResolver(schema) as unknown as Resolver<FormValues>` (`type Resolver` from `react-hook-form`) |
| `.next/dev/types/routes.d.ts … TS1128` | `next dev` açıkken eski rota tipleri kalmış | `rm -rf .next/types .next/dev/types && pnpm typecheck` (`pnpm typecheck` bunu otomatik yapar) |
| `only src/shared/pdf/fonts.ts calls Font.register` | Modülde doğrudan `Font.register(...)` çağrılmış | `registerSharedPdfFonts()` (`@/shared/pdf/fonts`) kullan |
| `Sayfası olmayan menü bağlantıları` (`navigation.test.ts`) | `module.config.ts` içindeki `nav`/`menu` href'inin `page.tsx`/`route.ts` karşılığı yok veya `sync` eksik | İlgili `page.tsx` / `routes/.../page.tsx` / `api/.../route.ts` dosyasını ekle (indirmeyse `isDownload: true`) ve `pnpm module:sync` çalıştır |
| `Select` hydration uyuşmazlığı | Liste (`map`) / SSR içinde `Select` kullanılmış | Liste satırlarında native `<select>`, formlarda `FormSelect` (`@/shared/components/forms/form-select`) veya `SelectField` (`@/shared/components/fields`) kullan |
