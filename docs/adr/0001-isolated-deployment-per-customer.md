# ADR 0001 — Hibrit, aşamalı çoklu müşteri mimarisi (yönetim katmanı + müşteri başına veritabanı + izole kurulum)

**Durum:** Önerildi — ürün sahibi yönü onayladı (2026-11-18); ayrıntılar aşama ADR'leriyle kesinleşir
**Tarih:** 2026-11-17 · **Revizyon:** 2026-11-18 (izole kurulumdan hibrit-aşamalı modele)
**Kapsam:** Barındırılan SaaS (Community / Business / Enterprise), self-host, tek kod tabanı
**Değiştirdiği plan:** `docs/ACCOUNTING_DEFERRED_ROADMAP.md` R1 (eski öneri: `organizationId` + PostgreSQL RLS)

## Bağlam

- Uygulama bugün **tek kurumlu** yazılmıştır. 36 modül, pg-boss işleri, şifreli dosya deposu, AI takma adları ve GoBD hash zinciri "bir kurulum = bir kurum" varsayar.
- Dağıtım hazırdır: üç Docker imajı (`migrator`, `worker`, `runner`). Tüm yapılandırma ortam değişkenleriyle yapılır (`DATABASE_URL`, `AUTH_SECRET`, `DATA_ENCRYPTION_*`, `MAIL_ENCRYPTION_KEY`, `AI_*`).
- **Modül pazaryeri** vardır: imzalı üçüncü taraf modüller uygulama süreci içinde, aynı veritabanı bağlantısıyla çalışır.
- Müşteriler Almanya ve AB'deki dernekler, KOBİ'ler, serbest çalışanlar ve ileride büyük kuruluşlardır. Veri hassastır: üye, bağış, banka, vergi, öğrenci/veli, personel. DSGVO ve GoBD yükümlülükleri vardır.
- **Ticari hedef (ürün sahibi kararı):** tek kod tabanıyla **SaaS + self-host**, eşit önemde. Paketler: Community (ücretsiz/çok küçük), Business (abonelik), Enterprise (özel altyapı, SLA, self-host).

## Seçenekler

| | A — Ortak veritabanı (`organizationId` + RLS) | B — Ortak çalışma zamanı, müşteri başına veritabanı | C — Müşteri başına izole kurulum |
|---|---|---|---|
| Veri sızıntısı riski | Yüksek: tek unutulan filtre, önbellek veya iş başka müşteriyi gösterir | Orta: SQL ayrık; süreç belleği, önbellek, anahtar ve kuyruk ortak | Düşük: süreç, bellek, veritabanı, anahtar ayrık |
| Üçüncü taraf modül riski | Tüm müşteriler | Tüm müşteriler (aynı süreç) | Yalnız modülü kuran müşteri |
| Mevcut koda etkisi | Çok büyük (her tablo, iş, dosya, GoBD serisi) | Büyük: süreç düzeyindeki her şey "o anki müşteriye göre" olmalı | Neredeyse yok |
| Müşteri başına maliyet | En düşük | Düşük | Orta (uyuyan konteynerle düşer) |
| Operasyon | En kolay | Kolay | En zor (yönetim katmanıyla otomatik) |
| Müşteriye özel yedek/geri yükleme/silme | Zor | Kolay | Kolay |

## Karar — hibrit, aşamalı

Hedef mimari **B ve C'nin birlikte yaşadığı hibrit modeldir**. Her şeyin üzerinde tek bir yönetim katmanı (control plane) bulunur. **A ana ürüne eklenmez.**

| Paket | Çalışma zamanı | Veri |
|---|---|---|
| **Community** | Ortak çalışma zamanı (Aşama 3'ten itibaren) | Müşteri başına veritabanı. Ekonomik değilse ayrı ADR ile daha ucuz bir model. |
| **Business** | Başlangıçta izole kurulum (C), Aşama 3'ten sonra ortak çalışma zamanı (B) | Müşteri başına veritabanı, ayrı dosya alanı ve anahtar |
| **Enterprise** | Her zaman ayrılmış kurulum (C): ayrı uygulama, worker, veritabanı, depolama, anahtar | Müşteriye özel; isterse self-host |
| **Self-host** | Aynı imajlar, yönetim katmanı yok | Müşterinin kendi altyapısı |

**Temel ilke:** Çoklu müşteri bir modül değil, **tüm modüllerin üzerinde çalıştığı platform sözleşmesidir**. Yeni bir modül müşteri mantığı yazmaz; müşteri bağlamını platformdan alır.

### Aşamalar

| Aşama | İçerik | Çıkış kriteri |
|---|---|---|
| **1 — Yönetim katmanı + izole kurulum (C)** | Müşteri açma (veritabanı, secret'lar, depolama, alan adı, konteynerler), aşamalı yayın, şifreli yedek, izleme, plan/fatura, self-host paketi. **Modül kodu değişmez.** | İlk ücretli müşteriler canlı; iki kurulum arasında erişim olmadığı otomatik testle kanıtlı. |
| **2 — Müşteri bağlamı sözleşmesi** | Süreç düzeyinde tek olan her şeyin envanteri ve müşteri bağlamına bağlanması: veritabanı istemcisi, şifreleme anahtarları ve `AUTH_SECRET`, pg-boss, dosya kökü, mail ayarları, AI bütçe/takma ad, Next önbellekleri. Modüller yalnız bu sözleşmeden erişir. CI'da çapraz müşteri testleri. | Tek süreçte iki test müşterisiyle tüm test paketi ve çapraz erişim testleri yeşil. |
| **3 — Ortak çalışma zamanı + müşteri başına veritabanı (B)** | Community ve küçük Business müşterileri ortak runtime'a. Sınırlı veritabanı istemci önbelleği, bağlantı havuzu (pgBouncer vb.), müşteri bazında migration takibi, kota. | Maliyet ölçümü hedefi karşılıyor; yük ve sızıntı testleri yeşil. |
| **4 — Merkezi kimlik ve paket geçişleri** | Bir kullanıcının birden fazla kurumda çalışması (yönetim katmanında SSO; yetkiler kurumda kalır), Community → Business → Enterprise geçişinde veri taşıma. | Kod değişmeden paket yükseltme; tek oturumla kurumlar arası geçiş. |

## Bağlayıcı kurallar

1. **Müşteri kimliği yalnızca doğrulanmış bağlamdan alınır:** oturum, yönetim katmanının yönlendirmesi veya imzalı iş zarfı. İstekte veya iş verisinde gelen müşteri kimliğine güvenilmez. Worker müşteriyi iş zarfının imzasından okur.
2. **Ortak çalışma zamanında yalnız onaylı (birinci taraf veya denetlenmiş) modüller çalışır.** Üçüncü taraf pazaryeri modülleri yalnız ayrılmış kurulumda ve self-host'ta etkinleştirilebilir.
3. **`tenantId` her tabloya eklenmez.** Müşteri verisi kendi veritabanındadır. Müşteri kimliği yalnız yönetim katmanı kataloglarında, iş zarflarında, merkezi metriklerde ve dış sistem meta verisinde tutulur.
4. **Müşteri başına anahtar:** şifreleme ve oturum anahtarları müşteriye özgüdür ve yönetim katmanının secret deposundan gelir. Bir anahtar iki müşteride kullanılmaz.
5. **Yönetim katmanı müşteri verisine erişmez.** Yalnız işletme verisi tutar: müşteri, plan, sürüm, sağlık, kullanım sayaçları. Yedekler müşteri anahtarıyla şifrelenir.
6. **Migration'lar geriye uyumludur** (genişlet → taşı → daralt) ve müşteri bazında izlenir. Aşamalı yayında eski ve yeni sürüm aynı şemada kısa süre birlikte çalışabilir.
7. **Log ve metrikler kişisel veri içermez** (mevcut kural). Müşteri kimliği metrik etiketi olarak bulunabilir.
8. **AI erişimi**, takma ad ve hash katmanından bağımsız olarak, müşteri ve kullanıcı yetkisine zorunlu olarak bağlıdır. Bir müşterinin AI bütçesi ve kotası ayrıdır.
9. **Veri yeri:** barındırılan sürüm AB/Almanya bölgesinde çalışır. AVV/DPA ve alt işleyen listesi yönetim katmanında tutulur.

## Sonuçlar

**Olumlu**
- Ürün hemen satılabilir (Aşama 1). Modül kodu ve GoBD mekanizmaları bu aşamada değişmez.
- Aynı kod tabanı küçük derneğe ortak altyapıda, büyük kuruluşa ayrılmış altyapıda ve self-host olarak sunulur. Müşteri büyüdükçe yazılım değiştirmeden paket değiştirir.
- Müşteri başına veritabanı sayesinde yedek, geri yükleme, dışa aktarma ve silme müşteri düzeyinde yapılabilir. DSGVO ve satış açısından güçlü bir argüman.
- Üçüncü taraf modül riski ortak çalışma zamanının dışında tutulur.

**Olumsuz / bedel**
- Aşama 2 büyük bir platform işidir: süreç düzeyindeki her bileşenin müşteri bağlamına taşınması. Tek bir unutulan nokta sızıntı riskidir; bu yüzden CI kapısı zorunludur.
- Çok sayıda veritabanı: bağlantı limitleri, migration operasyonu ve izleme yükü. Ortak runtime'da istemci önbelleği ve havuzlama gerekir.
- Community paketinde müşteri başına veritabanının ekonomisi ölçülmeden kesinleşmez.
- Merkezi kimlik (Aşama 4) gelene kadar birden fazla kurumda çalışan kişi her kurumda ayrı oturum açar.

## Yeniden değerlendirme tetikleyicileri

- Aşama 1 pilotunda izole kurulumun maliyeti, Business fiyatının hedef marjını karşılamıyorsa → Aşama 3 öne çekilir.
- Community için müşteri başına veritabanı ekonomik değilse → ayrı ADR (ör. küçük Community müşterilerini sınırlı modülle ortak bir veritabanında toplamak).
- Pazaryeri modülleri ayrı süreç/sandbox'ta çalışabilir hale gelirse → kural 2 gevşetilebilir.

## Sonraki ADR'ler

- ADR 0002 — Yönetim katmanı: müşteri açma, secret deposu, aşamalı yayın (Aşama 1).
- ADR 0003 — Müşteri bağlamı sözleşmesi ve süreç düzeyi bileşen envanteri (Aşama 2).
- ADR 0004 — Ortak çalışma zamanında bağlantı yönetimi ve kota (Aşama 3).
