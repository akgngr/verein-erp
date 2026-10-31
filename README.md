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

- Neon kullanılırsa `.env` içine iki adres girin: `DATABASE_URL` = **havuzlu (pooled)** adres
  (uygulama kullanır), `DIRECT_URL` = **havuzsuz (direct)** adres (`pnpm db:deploy` / `db:migrate` kullanır).
  Başka bir ayar gerekmez; `prisma.config.ts` `DIRECT_URL` varsa onu, yoksa `DATABASE_URL`'i kullanır.
  Prisma 7 ile `pgbouncer=true` parametresi gerekmez (zararsızdır, uygulama tarafında yok sayılır).
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

## 5. Yeni modül ekleme

```bash
pnpm module:create sponsors "Sponsorlar" "Sponsoren"   # çalışan iskelet (liste, çekmece form, TR/DE)
pnpm db:migrate --name add_sponsors
pnpm dev                                               # → /sponsors
```

Modül yalnızca `src/modules/<anahtar>/` altında yazılır; `src/app`, `src/registry.ts`, Prisma şeması
ve kök çeviri dosyaları `pnpm module:sync` tarafından üretilir (elle düzenlenmez).
Kurallar ve doğrulama adımları: [docs/MODULE_DEVELOPMENT_GUIDE.md](docs/MODULE_DEVELOPMENT_GUIDE.md)
(İngilizce: [docs/MODULE_DEVELOPMENT_GUIDE_EN.md](docs/MODULE_DEVELOPMENT_GUIDE_EN.md)).

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

## 8. Üyeler modülü eklemeleri (Faz 3 eklemeleri — Verein pivotu sonrası)

**Üyelik türü yönetimi (`/uyeler/turler`):**

- Dört sabit tür (Asıl / Onursal / Fahri / Destekçi) için yıllık aidat tutarı ve
  aktiflik yönetilir; tür ekleme/silme yapılmaz (enum sabittir — `MembershipTypeConfig`
  tablosu enum'a key'lenir; Faz 4 muhasebe aktarımı ve Faz 5 bağış bildirimleri bu
  enum'a bağımlıdır).
- Tutar boş = "belirlenmedi" (toplu aidat üretimi o türü atlar); 0 = aidat yok.
  Pasif tür yalnızca yeni üye kaydında gizlenir; mevcut üyelerin türü korunur.

**Yıllık aidat satırları (`MemberDue`) ve rapor (`/uyeler/aidat`):**

- Üye başına yıl başına tek satır (`@@unique([memberId, year])`): beklenen tutar,
  son ödeme tarihi, not ve durum (Açık / Kısmen / Ödendi / Muaf).
- Durum denormalizedir ve **yalnızca** `recalculateDueStatus` yazar; ödeme
  ekleme/iptal işlemleriyle aynı transaction içinde yeniden hesaplanır. Ödenen
  tutar kolonda tutulmaz — void edilmemiş `MemberPayment` kayıtlarından hesaplanır.
- Ödemeler aidat satırına `dueId` FK ile DEĞİL, `(memberId, dueYear)` çiftiyle
  bağlanır; aidat satırı olmayan ödemeler de geçerlidir (geçmiş kayıtlar bozulmaz).
- Toplu üretim: yıl (geçen yıl .. gelecek yıl) + son ödeme tarihi seçilir, dry-run
  önizlemeden sonra onaylanır; uygunluk = aktif üye + türün aidat tutarı > 0 +
  katılım tarihi ≤ yıl sonu + o yıl satırı yok. İkinci çalıştırma mükerrer üretmez.
- "Muaf" elle verilir (ödemesi olmayan satırda); raporda beklenen tutara dahil edilmez.
- Excel dışa aktarım: `GET /api/members/dues/export` (yıl/filtre parametreleri raporla aynı).

**Excel içe aktarma (`/uyeler/ice-aktar`):**

- Şablon: `GET /api/members/import-template` ("Üyeler" + "Açıklamalar" sayfalı xlsx).
- İki adımlı: "Kontrol et" (dry-run, hiçbir kayıt yazmaz) → satır bazlı Türkçe hata
  raporu → "İçe aktar" (hatalı satırlar atlanır, geçerli satırlar tek transaction'da).
- Zorunlu sütunlar: Ad, Soyad, Üyelik Türü, Üyelik Başlangıç Tarihi. Tarih biçimi
  gg.aa.yyyy. Tür eşleme: TR adları (Asıl Üye vb.) + yaygın DE karşılıklar.
- Mükerrer kontrol: e-posta (küçük/büyük duyarsız) veya ad+soyad+doğum tarihi —
  hem DB'de hem dosya içinde. Kimlik numarası/banka bilgisi içe AKTARILMAZ (KVKK).
- Sınırlar: 5 MB, 2.000 satır, yalnız .xlsx. Üye numaraları içe aktarım yılı
  sayacından atanır; dosyada numara sütunu bulunmaz.

**i18n notu:** members modülü `next-intl` kullanır (non-routing mod, `NEXT_LOCALE`
çerezi); `src/i18n/request.ts` + `next.config.ts`'teki `createNextIntlPlugin` ve root
layout'taki `NextIntlClientProvider` bu modun zorunlu parçalarıdır.
