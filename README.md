# Dernek Yönetim Sistemi — Faz 0 (Temel Altyapı)

Next.js (App Router) + TypeScript + Prisma (PostgreSQL) + Auth.js v5 + HeroUI üzerine
kurulu, **modüler monolit** mimarili dernek yönetim uygulaması. Bu faz yalnızca temel
altyapıyı içerir: kimlik doğrulama, roller/yetkiler, layout, ortak DataTable ve form
altyapısı. Evrak / Toplantı / Üye modülleri iskelet düzeyindedir.

---

## 1. PostgreSQL kurulumu (macOS, Homebrew — Docker KULLANMADAN)

```bash
brew install postgresql@16
brew services start postgresql@16
createdb dernek
```

Yerel geliştirmede bağlantı, oturum açtığınız işletim sistemi kullanıcısı üzerinden
(parolasız) yapılır: `postgresql://KULLANICI_ADIN@localhost:5432/dernek`
(`KULLANICI_ADIN` = `whoami` çıktısı).

## 2. `.env` hazırlama

```bash
cp .env.example .env
```

`.env` içindeki alanlar:

| Değişken | Açıklama |
| --- | --- |
| `DATABASE_URL` | PostgreSQL bağlantı adresi (bkz. 1. bölüm). |
| `AUTH_SECRET` | `openssl rand -base64 32` ile üretin. |
| `AUTH_TRUST_HOST` | Yerel/sunucu dağıtımı için `true` bırakın. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | İlk yönetici seed bilgileri. Geçici parola parola kuralına uymalıdır: en az 10 karakter, 1 büyük harf, 1 küçük harf, 1 rakam. |

Eksik veya geçersiz değişken durumunda uygulama, açıklayıcı bir hata ile durur
(`src/shared/env.ts`).

## 3. Kurulum ve çalıştırma

```bash
pnpm install
pnpm db:migrate   # prisma migrate dev (ilk şema + migration geçmişi)
pnpm db:seed      # ilk yönetici (idempotent — kullanıcı varsa dokunmaz)
pnpm dev          # http://localhost:3000
```

Diğer komutlar: `pnpm build`, `pnpm start`, `pnpm lint`, `pnpm typecheck`, `pnpm db:studio`.

İlk yönetici ilk girişte (`/giris`) parolasını değiştirmeye zorlanır; değiştirmeden
panelin hiçbir sayfasına gidemez.

## 4. Neon (yönetilen PostgreSQL) ve sunucuya taşıma

- Neon kullanılırsa `.env` içine `DATABASE_URL` (pooler) ve `DIRECT_URL` ekleyin,
  ardından `prisma/schema/base.prisma` içindeki `datasource db` bloğuna
  `directUrl = env("DIRECT_URL")` satırını ekleyin ve `pnpm db:migrate` çalıştırın.
  (Bu satır varsayılan olarak yoktur; yalnızca Neon'a geçildiğinde eklenir.)
- Yerelden sunucuya veri taşıma:

```bash
pg_dump -Fc -d dernek -f dernek.dump
pg_restore --no-owner --no-acl -d "$DATABASE_URL" dernek.dump
```

- Sunucu imajı (Coolify): depodaki `Dockerfile` çok aşamalıdır (deps → build → runner),
  `next.config.ts` içinde `output: "standalone"` kullanılır, root olmayan kullanıcı ile
  çalışır, konteyner başlangıcında `prisma migrate deploy` çalışır. Sağlık kontrolü
  `/api/health` uç noktasını kullanır. Yerelde bu imaj çalıştırılmaz.

## 5. Yeni modül ekleme (yalnızca 6 adım)

1. `src/modules/<yeni>/` klasörünü standart yapıyla oluşturun:
   `index.ts`, `server.ts`, `ui.ts`, `module.config.ts`, `permissions.ts`
   (+ gerektiğinde `schemas/`, `queries/`, `actions/`, `components/`, `views/`).
2. `prisma/schema/<yeni>.prisma` dosyasını ekleyin, `pnpm db:migrate` ile migration oluşturun.
3. `permissions.ts` içinde yetkileri `definePermissions` ile tanımlayın.
4. `module.config.ts` içinde menü öğelerini tanımlayın (icon, href, group, order, permission).
5. `src/registry.ts` içindeki listeye modülü ekleyin.
6. `src/app/(dashboard)/<rota>/page.tsx` ince route dosyalarını oluşturun
   (yalnızca modül view bileşenini render eder).

Bu 6 adım dışında `shared` ya da başka bir modül değiştirilmez.

## 6. Mimari kurallar (özet)

**Üç katman:**

- `src/shared/` — domain bilgisi taşımayan altyapı (DataTable, form alanları, yetki
  motoru, audit yazıcı, `db`, `env`). Hiçbir modülü ve `src/app`'i import edemez.
- `src/modules/<modül>/` — iş alanı modülleri; kendi şeması, yetkileri, sorguları,
  action'ları ve ekranları içindedir. `shared`'i ve (izin verilen) başka modüllerin
  public API'sini import edebilir; `src/app`'i import edemez.
- `src/app/` + `src/registry.ts` — birleştirme katmanı; route dosyaları İNCE'dir
  (yalnızca view render eder; iş mantığı içermez).

**Public giriş noktaları** (ESLint `no-restricted-imports` ile zorunlu):

- `@/modules/<modül>` → izomorfik (tipler, zod şemaları, permissions, module.config)
- `@/modules/<modül>/server` → yalnızca sunucu (`import "server-only"`)
- `@/modules/<modül>/ui` → view bileşenleri
- `@/modules/auth/edge` → yalnızca auth; middleware için Prisma'sız yapılandırma

Diğer her `@/modules/*/*` yolu yasaktır. `src/shared/**` içinde `@/modules/**` ve
`@/app/**`; `src/modules/**` içinde `@/app/**` yasaktır.

**Modül bağımlılık yönü** (tek yönlü, döngü yasak):
`users`, `audit`, `documents`, `meetings`, `members` → `auth`.
Modüller arası ilişkiler Prisma FK yerine düz ID (+ gerekirse snapshot) alanlarıyla
kurulur (ör. `AuditLog.userId` FK değildir).

**Kimlik doğrulama ve yetki:**

- Auth.js v5, Credentials provider, JWT stratejisi (8 saat). Middleware `src/proxy.ts`
  (Next.js 16) edge-uyumlu `auth.config.ts` kullanır; Prisma içermez.
- Güvenlik yalnızca middleware'e bırakılmaz: her view ve action `requireUser()` /
  `requirePermission()` ile kullanıcıyı veritabanından yeniden okur; pasif kullanıcı
  etkisiz hale getirilir.
- Parola kuralı tek noktadan: `src/shared/security/password.ts` (bcrypt cost 12).
- Tüm yazma action'ları `createAction` sarmalayıcısıyla yazılır; denetim kaydı
  (`writeAudit`) parola alanlarını otomatik temizler.
