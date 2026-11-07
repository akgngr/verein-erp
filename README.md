# Verein ERP — Dernek Yönetim Sistemi

Almanya'daki dernekler (eingetragene Vereine) ve küçük işletmeler için **modüler monolit** yönetim
uygulaması. Üyelik, aidat, muhasebe (GoBD, DATEV, e-fatura), bağış, hibe, SEPA otomatik ödeme,
etkinlik, toplantı, kurs/öğrenci, kampanya, CRM, e-imza ve otomasyon tek bir uygulamada; her alan
açılıp kapatılabilen ayrı bir modüldür. Arayüz Türkçe ve Almanca, resmî belgeler Almanca (isteğe
bağlı Türkçe) üretilir.

**Teknoloji:** Next.js 16 (App Router) · TypeScript · Prisma 7 + PostgreSQL · Auth.js v5 · HeroUI ·
pg-boss (arka plan işleri) · next-intl · @react-pdf · Zod. Redis, Kubernetes veya ücretli servis
gerektirmez.

---

## İçindekiler

1. [Modüller](#1-modüller)
2. [Kurulum](#2-kurulum)
3. [Ortam değişkenleri](#3-ortam-değişkenleri)
4. [Komutlar](#4-komutlar)
5. [Mimari](#5-mimari)
6. [Veri koruma ve güvenlik](#6-veri-koruma-ve-güvenlik)
7. [Dağıtım ve yedekleme](#7-dağıtım-ve-yedekleme)
8. [Yeni modül geliştirme](#8-yeni-modül-geliştirme)
9. [Belgeler](#9-belgeler)

---

## 1. Modüller

Modüller **Ayarlar → Modül Yönetimi** ekranından açılıp kapatılır. Çekirdek (CORE) modüller her zaman
açıktır. Başka modülün verisine erişen modüller, yöneticinin onayladığı erişim izni ister.

### Üyeler ve ilişkiler
| Modül | Ne yapar |
| --- | --- |
| **Üyeler** | Üyelik numarası, üyelik türleri, yıllık aidat satırları, ödemeler ve makbuzlar, ayrılış/fesih, Excel içe/dışa aktarım, DSGVO veri dökümü, SEPA otomatik ödeme yetkisi, Bundesland/ülke alanları. |
| **Öğrenciler / Kurslar / Öğrenci takibi** | Öğrenci ve veli kayıtları (DATEV Debitor numarası), kurslar, dersler, kayıtlar, taksitler ve ödemeler, öğretmen ödemeleri, yoklama, not ve veli raporu PDF'i. |
| **CRM** | Üyeler ve cari hesaplar üzerinde ilişki katmanı: aşamalar, etiketler, fırsat panosu, zaman akışı, takipler. Kişi verisi kaynakta kalır. |
| **e-Sign** | Kişiye e-posta/SMS/WhatsApp ile süreli bağlantı; kişi eksik bilgileri, Datenschutz ve isteğe bağlı onayları doldurup imzalar. Reşit olmayan öğrencide veli onaylar. İmzalı PDF ve benzersiz belge anahtarı (`ES-YYYY-XXXXXXXX`) saklanır. |

### Mali işler
| Modül | Ne yapar |
| --- | --- |
| **Muhasebe** | Kasa/banka hesapları, gelir-gider fişleri (KDV, Sphären), projeler, bütçe, SKR03/SKR04, DATEV EXTF, UStVA ve EÜR, faturalar ve teklifler (XRechnung / ZUGFeRD), açık kalemler, ihtarlar, ödeme çalıştırması (pain.001), banka ekstresi içe aktarma (CAMT/MT940/CSV), gelen faturalar, demirbaş ve AfA, GoBD (zincirli günlük, Z3 dışa aktarım, kasa kapanışı), yıl kapanışı. |
| **Hibeler** *(Muhasebe menüsünde)* | Hibe/Zuwendung kaydı, finansman planı (kategori eşlemeli), ödemeler, plan/gerçekleşen ve %20 sapma uyarısı, belge listesi, faaliyet raporu ve **Verwendungsnachweis PDF'i**. |
| **SEPA otomatik ödeme** *(Muhasebe menüsünde)* | Açık aidatlar ve kurs ücretleri için önizlemeli tahsilat, **pain.008.001.08** dosyası (CORE/RCUR), tahsilatın makbuz/fiş olarak kaydı, geri dönen ödemeler. |
| **Bağışlar** | Bağışçılar, bağışlar, Zuwendungsbestätigung (bağış makbuzu) PDF'leri. |
| **Banka bağlantısı** | Lisanslı sağlayıcı üzerinden hesap hareketlerinin otomatik alınması. |
| **Envanter** | Demirbaş ve stok; muhasebedeki demirbaş kayıtlarıyla eşleşme. |

### İletişim, organizasyon ve otomasyon
| Modül | Ne yapar |
| --- | --- |
| **Kampanyalar** | E-posta (blok düzenleyici), SMS, WhatsApp, Telegram; alıcı kaynakları (üyeler, veliler, etkinlik/toplantı katılımcıları), rıza denetimi, zamanlama, teslim/açılma/tıklama ve okundu raporları. Kanallar ayrı eklenti modülleridir. |
| **Etkinlikler / Toplantılar / Görevler** | Etkinlik kaydı ve katılımcılar, toplantı gündemi, kararlar, tutanak PDF'i, görevler. |
| **Takvim** | Tüm modüllerin tarihleri tek takvimde; ICS aboneliği; Google/Outlook/Apple senkronu (eklenti). |
| **Evrak Kayıt** | Gelen/giden evrak numaralandırma, dosya önizleme, durum takibi. |
| **Otomasyon** | Görsel iş akışı düzenleyici, olay tetikleyicileri, kalıcı arka plan işleri (pg-boss worker). |
| **Yapay zekâ asistanı** | Modüllerin araçlarını kullanan sohbet; veri sınıflandırmasına göre yalnız izinli (çoğunlukla toplu) veriyi görür, değişiklikleri önerir ve kullanıcı onaylar. |
| **Dosyalarım, Geri bildirim, Demo veri, Security Monitor** | Üretilen dosyalar, test kullanıcılarından hata/öneri, örnek veri, güvenlik testleri. |

---

## 2. Kurulum

Gereksinimler: Node.js ≥ 22.12, pnpm, PostgreSQL 16+ (Docker gerekmez).

```bash
brew install postgresql@16 && brew services start postgresql@16   # macOS örneği
createdb dernek
cp .env.example .env            # değerleri doldurun (bkz. 3. bölüm)
pnpm install
pnpm db:migrate                 # şema + migration geçmişi
pnpm db:seed                    # ilk yönetici (idempotent)
pnpm dev                        # http://localhost:3000
```

Arka plan işleri (kampanya gönderimi, e-Sign PDF'i, zamanlanmış görevler) için ayrı bir terminalde:

```bash
pnpm automation:worker          # .env: AUTOMATION_ENABLED=true, AUTOMATION_WORKER_ENABLED=true
```

`pnpm dev:full` web sunucusunu ve worker'ı birlikte başlatır. İlk yönetici ilk girişte (`/giris`)
parolasını değiştirmek zorundadır. Kurulum sihirbazı dernek/işletme türüne göre modül önerir.

## 3. Ortam değişkenleri

| Değişken | Açıklama |
| --- | --- |
| `DATABASE_URL` | PostgreSQL bağlantısı. Neon vb. havuzlu sunucuda ek olarak `DIRECT_URL` (migration için havuzsuz adres). |
| `AUTH_SECRET` | `openssl rand -base64 32`. Veritabanında saklanan sırlar (kanal anahtarları, imzalar, SEPA dosyaları) bundan türetilen anahtarla şifrelenir; **değiştirilirse bu kayıtlar çözülemez.** |
| `AUTH_TRUST_HOST` | Sunucu dağıtımında `true`. |
| `AUTOMATION_ENABLED` / `AUTOMATION_WORKER_ENABLED` | Otomasyon ve worker. Kapalıysa e-Sign PDF'i doğrudan üretilir, kampanyalar çalışmaz. |
| `UPLOAD_DIR` / `MAX_UPLOAD_MB` | Yüklenen dosyaların klasörü (üretimde kalıcı volume) ve dosya başına sınır. |
| `ORGANIZATION_NAME` | Dernek bilgileri girilene kadar kullanılan ad. |
| `DOCUMENT_LANGUAGE` | Resmî PDF'lerin varsayılan dili: `de` (varsayılan) veya `tr`. PDF uçlarında `?lang=` ile değiştirilebilir. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | İlk yönetici (seed). Parola: en az 10 karakter, büyük/küçük harf ve rakam. |

Eksik veya geçersiz değişkende uygulama açıklayıcı bir hatayla durur (`src/shared/env.ts`).
SMTP, SMS/WhatsApp/Telegram sağlayıcıları, banka bağlantısı ve yapay zekâ anahtarları ortam
değişkeni değil, uygulama içindeki ayar ekranlarından girilir ve şifreli saklanır.

## 4. Komutlar

| Komut | Açıklama |
| --- | --- |
| `pnpm dev` / `pnpm dev:full` | Geliştirme sunucusu (+ worker). |
| `pnpm build` / `pnpm start` | Üretim derlemesi ve sunucu. |
| `pnpm automation:worker` | Arka plan iş işleyicisi. |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | ESLint, TypeScript, testler (`pnpm test:<alan>` ile tek alan). |
| `pnpm module:sync` | Modül şemalarını, rota köprülerini, kayıt dosyalarını ve çevirileri yeniden üretir. |
| `pnpm module:create <anahtar> "<TR ad>" "<DE ad>"` | Çalışan modül iskeleti. |
| `pnpm module:check` / `pnpm module:deps` | Modül standardı ve bağımlılık denetimi. |
| `pnpm db:migrate` / `pnpm db:deploy` / `pnpm db:verify` | Migration üretimi, uygulanması, veritabanı bütünlük kontrolü. |
| `pnpm db:seed` / `pnpm db:studio` | İlk yönetici, Prisma Studio. |

## 5. Mimari

**Katmanlar**

- `src/shared/` — domain bilmeyen altyapı: DataTable ve form bileşenleri, yetki motoru, denetim
  kaydı, `db`, `env`, PDF antet ve fontları, şifreleme (`secret-box`), modül sözleşmeleri
  (takvim, kampanya kanalı, AI aracı, otomasyon görevi…). Hiçbir modülü import edemez.
- `src/modules/<modül>/` — her iş alanı kendi şemasını (`schema.prisma`), yetkilerini, servislerini,
  action'larını, ekranlarını, çevirilerini (`messages/tr|de.json`) ve sürüm notlarını
  (`releases.json`) taşır.
- `src/app/` ve `src/*-registry.ts` — `pnpm module:sync` ile **üretilir**, elle düzenlenmez.
  Sayfa/API köprüleri `(dashboard)/(modules)`, `api/(modules)` ve oturumsuz sayfalar için
  `(public)/(modules)` altındadır.

**Modül sözleşmeleri** (dosya adıyla otomatik keşfedilir): `page.tsx` + `routes/` (sayfalar),
`api/` (uç noktalar), `public/` (oturumsuz sayfalar, ör. `/formular/<belirteç>`), `automation.ts`
(görev/olay), `calendar.ts`, `channels.ts`, `recipients.ts`, `ai.ts`, `lifecycle.ts`
(kullanıcı silinince), `cards` (panel kartları), `demo.ts`.

**Kurallar**

- Public girişler yalnızca `@/modules/<m>`, `/server`, `/ui`, `/automation` (ESLint ile zorunlu).
- Modüller arası FK yoktur; düz ID ile bağlanılır. Başka modülün verisine erişim
  `module.config.ts → access` ile bildirilir ve yönetici onayı ister.
- Tüm yazma işlemleri `createAction` ile: yetki, Zod doğrulaması, denetim kaydı.
- Her view/action kullanıcıyı ve yetkisini veritabanından yeniden okur; yalnız middleware'e
  güvenilmez.
- Her modül değişikliğinde `module.config.ts` sürümü ve `releases.json` güncellenir (CI denetler).
- Arayüzde sabit metin yasaktır (CI `check-hardcoded-text` ile denetler); tüm metinler tr/de.

## 6. Veri koruma ve güvenlik

- **Veri sınıflandırması** (`src/shared/data-policy.ts`, K0–K3): her tablo için kategori ve hassas
  alanlar. Yapay zekâ yalnız izinli tabloları ve çoğunlukla toplu değerleri görür; testler bunu
  zorunlu kılar.
- Sırlar (sağlayıcı anahtarları, e-imza görselleri ve kanıtları, SEPA dosyaları) AES-256-GCM ile
  şifreli saklanır. IBAN arayüzde maskelenir.
- Rıza: kampanyalar yalnız açık rızası olan kanallara gider (UWG §7, DSGVO Art. 6/7); toplu
  e-posta itirazı ayrı tutulur.
- Kullanıcı silinince modüllerin `lifecycle.ts` kancaları kişisel bağlantıları temizler.
- Denetim kaydı kişi adı yerine numara kullanır; PDF/XML indirmeleri kaydedilir.
- CI: tip ve lint kontrolleri, testler, CodeQL, gitleaks (yanlış alarmlar `.gitleaksignore`'da
  gerekçeyle), bağımlılık denetimi.

## 7. Dağıtım ve yedekleme

- Çok aşamalı `Dockerfile`: web (`output: "standalone"`) ve ayrı **worker** imajı. Konteyner
  başlarken `prisma migrate deploy` çalışır; sağlık kontrolü `/api/health`.
- `UPLOAD_DIR` için kalıcı volume bağlanmalıdır.
- **Yedek:** veritabanı (`pg_dump -Fc`) ve `UPLOAD_DIR` **birlikte** alınmalıdır; `AUTH_SECRET`
  ayrıca güvenli saklanmalıdır (şifreli kayıtlar ona bağlıdır).
- Ayrıntılar: [docs/DEPLOYMENT_GITHUB_COOLIFY.md](docs/DEPLOYMENT_GITHUB_COOLIFY.md),
  [docs/AUTOMATION_WORKER.md](docs/AUTOMATION_WORKER.md).

## 8. Yeni modül geliştirme

```bash
pnpm module:create sponsors "Sponsorlar" "Sponsoren"
pnpm db:migrate --name add_sponsors
pnpm dev                       # → /sponsors
```

Kurallar ve kontrol listesi: [docs/MODULE_DEVELOPMENT_GUIDE.md](docs/MODULE_DEVELOPMENT_GUIDE.md)
([English](docs/MODULE_DEVELOPMENT_GUIDE_EN.md)).

## 9. Belgeler

| Belge | Konu |
| --- | --- |
| [docs/ACCOUNTING_ROADMAP.md](docs/ACCOUNTING_ROADMAP.md) | Muhasebe yol haritası (ACC-1…8) |
| [docs/specs/E_INVOICE.md](docs/specs/E_INVOICE.md) | E-fatura (XRechnung/ZUGFeRD) teknik şartnamesi ve yapılacaklar |
| [docs/specs/CAMPAIGNS_MODULE.md](docs/specs/CAMPAIGNS_MODULE.md) | Kampanyalar |
| [docs/specs/CRM_MODULE.md](docs/specs/CRM_MODULE.md) | CRM |
| [docs/AUTOMATION_ENGINE.md](docs/AUTOMATION_ENGINE.md) | Otomasyon motoru |
| [docs/veri-hassasiyeti.md](docs/veri-hassasiyeti.md) | Veri hassasiyeti sınıfları |
| [docs/specs/TODO_SECURITY_TESTING.md](docs/specs/TODO_SECURITY_TESTING.md) | Güvenlik testleri |
| `docs/specs/phase-*.md` | Faz şartnameleri (toplantılar, üyeler, muhasebe uyumu, bağışlar) |
