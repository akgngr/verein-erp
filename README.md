# Dernek Yönetim Sistemi — Faz 0 (Temel Altyapı) + Faz 1 (Evrak Kayıt)

Next.js (App Router) + TypeScript + Prisma (PostgreSQL) + Auth.js v5 + HeroUI üzerine
kurulu, **modüler monolit** mimarili dernek yönetim uygulaması. Faz 0 temel altyapıyı
(kimlik doğrulama, roller/yetkiler, layout, ortak DataTable ve form altyapısı),
Faz 1 ise tam çalışan **gelen/giden evrak kayıt modülünü** içerir: kayıt numarası
üretimi, dosya yükleme/indirme/önizleme, durum takibi, işlem notları, arama/
filtreleme, Excel dışa aktarım ve denetim kaydı entegrasyonu. Toplantı / Üye
modülleri iskelet düzeyindedir.

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
| `UPLOAD_DIR` | Evrak dosyalarının diske yazılacağı klasör (varsayılan `./storage/uploads`). Üretimde mutlak yol + kalıcı volume kullanın. |
| `MAX_UPLOAD_MB` | Dosya başına en fazla boyut (MB, varsayılan 20). |

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

### Evrak dosyaları için kalıcı volume ve yedekleme (Faz 1)

- Coolify'da `UPLOAD_DIR` için kalıcı volume bağlayın (imajda `/app/storage/uploads`
  hazırdır ve root olmayan kullanıcıya aittir). Volume bağlanmazsa yeniden
  dağıtımda yüklenen dosyalar kaybolur.
- **Yedekleme:** veritabanı yedeği (`pg_dump`) ile `UPLOAD_DIR` klasörü
  **birlikte** yedeklenmelidir; ikisi tek bir bütünün parçalarıdır.
- `storage/` klasörü `.gitignore` içindedir; yükleme dosyaları repoya girmez.
- Evrak kayıt numarası biçimi: `GLN-<yıl>-<sıra>` (gelen) / `GDN-<yıl>-<sıra>`
  (giden); sıra yön + yıl bazındadır, 4 hane sıfır dolguludur ve 9999'u aşarsa
  hane sayısı kendiliğinden artar.
- Yeni dosya türü eklemek için `src/modules/documents/constants.ts`
  içindeki `FILE_TYPE_RULES` listesine uzantı + beklenen MIME + imza türü
  ekleyin; izin listesi tek yerden yönetilir.

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

## 7. Toplantılar modülü (Faz 2)

**Numara biçimleri:**

- Toplantı: `TOP-<yıl>-<sıra>` (ör. `TOP-2026-001`); sıra yıl içinde tüm türlerde ortaktır,
  `MeetingCounter` üzerinde atomik upsert ile üretilir. Numara sonradan değiştirilemez;
  toplantı tarihi başka yıla kayarsa bile numara aynı kalır. Silinen toplantının numarası
  yeniden kullanılmaz.
- Karar: `<yıl>/<sıra>` (ör. `2026/7`); yıl bazında ortak sayaç. Karar silinirse numara
  boşluk bırakır, asla tekrarlanmaz.

**Onay akışı ve kilitleme:**

- Durumlar: Planlandı → Yapıldı (taslak) → Onaylandı; İptal edildi ↔ Planlandı.
- Onaylamak için en az 1 gündem maddesi ve en az 1 "Katıldı" katılımcısı gerekir.
  `quorumRequired` tanımlıysa ve sağlanmadıysa UI uyarır; onay yine de mümkündür.
- Onaylı tutanak kilitlenir: içerik (toplantı, gündem, katılımcı, karar, görev ekleme/
  düzenleme) düzenlenemez; "Yeniden aç" yalnızca `approve` yetkisiyle ve zorunlu gerekçeyle
  yapılır (gerekçe denetim kaydına işlenir).
- Görev durumu (Tamamlandı/Açık) ve ek yükleme onaylı toplantıda da çalışır; onaylı
  toplantının ekini yalnızca yönetici (delete) silebilir.

**`ORGANIZATION_NAME`:** Tutanak PDF'i antetinde görünür; `.env` içinde ayarlanır
(varsayılan `Dernek`). Değişiklik sonrası sunucu yeniden başlatılmalıdır.

**Fontlar ve lisans:** Tutanak PDF'i Noto Sans (Regular + Bold, OFL lisansı) kullanır;
TTF dosyaları `src/modules/meetings/assets/fonts/` altında depolanır. Standart PDF
fontları Türkçe glifleri (ğ, İ, ş…) oluşturamadığı için gereklidirler.

**Yedekleme:** Veritabanı ve `UPLOAD_DIR` birlikte yedeklenmelidir; ek dosyaları diskte
`UPLOAD_DIR/meetings/<yıl>/<toplantıId>/` altındadır, kayıtlar DB'dedir. Toplantı silinse
bile diskteki dosyalar korunur (yumuşak silme).

**Paylaşılan dosya katmanı:** `src/shared/files/` hem Evrak hem Toplantı modülü tarafından
kullanılır (uzantı → MIME → magic byte doğrulaması, yol güvenliği, indirme başlıkları).
Evrak modülü pptx kabul etmez; toplantılar tüm listeyi kabul eder. Her iki modülde de
`MAX_UPLOAD_MB` sınırı geçerlidir.
