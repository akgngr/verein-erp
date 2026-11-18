# ADR 0001 — Müşteri başına izole kurulum + yönetim katmanı (çok kiracılı ortak veritabanı yerine)

**Durum:** Önerildi — ürün sahibi onayı bekliyor · **Tarih:** 2026-11-18
**Kapsam:** Barındırılan (SaaS) teklif, self-host, gelecekteki "Lite" ürün
**Değiştirdiği plan:** `docs/ACCOUNTING_DEFERRED_ROADMAP.md` R1 (eski öneri: `organizationId` + PostgreSQL RLS)

## Bağlam

- Uygulama bugün **tek kurumlu** yazılmıştır. 36 modül, pg-boss işleri, şifreli dosya deposu, AI takma adları ve GoBD hash zinciri "bir kurulum = bir kurum" varsayar.
- Dağıtım hazırdır: üç Docker imajı (`migrator`, `worker`, `runner`). Tüm yapılandırma ortam değişkenleriyle yapılır (`DATABASE_URL`, `AUTH_SECRET`, `DATA_ENCRYPTION_*`, `MAIL_ENCRYPTION_KEY`, `AI_*`).
- **Modül pazaryeri** vardır: imzalı üçüncü taraf modüller uygulama süreci içinde, aynı veritabanı bağlantısıyla çalışır.
- Müşteriler Almanya'daki dernekler, KOBİ'ler ve serbest çalışanlardır. Veri hassastır: üye, bağış, banka, vergi, öğrenci/veli. DSGVO ve GoBD yükümlülükleri vardır.

## Seçenekler

| | A — Ortak veritabanı (`organizationId` + RLS) | B — Ortak uygulama, kurum başına veritabanı | **C — Müşteri başına izole kurulum (uygulama + veritabanı) + yönetim katmanı** |
|---|---|---|---|
| Veri sızıntısı riski | Yüksek: tek unutulan filtre, önbellek anahtarı veya pg-boss işi başka kurumu gösterir. RLS azaltır, sıfırlamaz. | Orta: SQL ayrık, ama süreç belleği, önbellek ve üçüncü taraf modül ortak. | **Düşük:** süreç, bellek, veritabanı ve anahtarlar ayrık. |
| Üçüncü taraf modül riski | Tüm müşteriler etkilenir | Tüm müşteriler etkilenir (aynı süreç) | **Yalnız modülü kuran müşteri** |
| Mevcut koda etkisi | Çok büyük: 36 modül, işler, dosyalar, AI, GoBD serileri kurum bazına | Büyük: istek başına bağlantı seçimi, tüm singleton'lar | **Neredeyse yok:** kod tek kurumlu kalır |
| GoBD / değişmezlik | Hash zinciri ve numara serileri kurum bazına bölünür, denetimde açıklaması zor | Kurum başına ayrık | **Bugünkü gibi** |
| DSGVO: silme, dışa aktarma, yedek, veri yeri | Satır seviyesinde, karmaşık | Veritabanı seviyesinde | **Kurulum seviyesinde, basit;** müşteri isterse self-host |
| Müşteri başına altyapı maliyeti | En düşük | Düşük | Orta → uyuyan konteyner ve ortak Postgres kümesiyle düşürülür |
| Operasyon (güncelleme, izleme) | En kolay (tek kurulum) | Kolay | **En zor** → yönetim katmanıyla otomatikleştirilir |

## Karar

**C seçilir.** Her müşteri için:
- ayrı web ve worker konteyneri,
- ortak bir Postgres kümesinde **ayrı veritabanı** ve ayrı veritabanı kullanıcısı,
- ayrı şifreleme anahtarları (`DATA_ENCRYPTION_*`, `MAIL_ENCRYPTION_KEY`, `AUTH_SECRET`),
- ayrı dosya deposu (bucket/prefix + müşteri anahtarı),
- ayrı alan adı veya alt alan adı.

Bunları tek bir **yönetim katmanı (control plane)** açar, günceller, yedekler ve faturalar. Yönetim katmanı **müşteri verisine erişmez**; yalnız işletme verisi tutar: müşteri, plan, sürüm, sağlık durumu, kullanım sayaçları.

Ana ürüne ortak veritabanlı çok kiracılık (A) **eklenmez**. Çok küçük müşteriler için ileride düşük fiyatlı bir "Lite" teklif gerekirse, bu **ayrı ve sınırlı bir ürün** olarak (üçüncü taraf modül yok, sınırlı modül seti) A ile tasarlanır ve ayrı bir ADR ile karara bağlanır.

## Sonuçlar

**Olumlu**
- Modül kodu, GoBD mekanizmaları ve AI gizlilik katmanı değişmeden kalır. Çapraz kurum sızıntısı yapısal olarak engellenir.
- Üçüncü taraf modül riski müşteri sınırında kalır.
- "Verin ayrı veritabanında; istersen kendi sunucunda" diyebilmek DSGVO açısından güçlü bir satış argümanıdır. Barındırılan ve self-host sürümler aynı imajları kullanır.
- Müşteri başına sürüm sabitleme, aşamalı yayın ve geri alma mümkündür.

**Olumsuz / bedel**
- Operasyon yükü: yüzlerce kurulumun güncellenmesi, izlenmesi ve yedeklenmesi. → Yönetim katmanı ve otomasyon zorunludur (R1 adımları).
- Müşteri başına sabit maliyet. → Uyuyan konteyner (scale-to-zero), küçük kaynak profilleri ve ortak Postgres kümesi.
- Müşteriler arası rapor ve istatistik yalnız yönetim katmanındaki işletme verisinden alınır. Bu bilinçli bir sınırdır.
- Bir kullanıcı birden fazla kurumda çalışıyorsa (ör. birkaç derneğin saymanı) her kurum için ayrı oturum açar. Tek oturum (SSO) ileride yönetim katmanında çözülebilir.

## Uygulama ilkeleri

1. Uygulama imajları **müşteri bilgisinden bağımsız** kalır; müşteriye özgü her şey ortam değişkeni ve secret'tır.
2. Migration'lar **geriye uyumlu** yazılır (genişlet → taşı → daralt). Aşamalı yayında eski ve yeni sürüm aynı şemada kısa süre birlikte çalışabilmelidir.
3. Yönetim katmanının müşteri veritabanına **okuma yetkisi yoktur**. Yedekler müşteri anahtarıyla şifrelenir; geri yükleme müşteri onayıyla yapılır.
4. Loglar ve metrikler kişisel veri içermez (mevcut kural). Merkezi izleme bu varsayımla kurulur.
5. Self-host kurulumda yönetim katmanı yoktur; aynı imajlar ve `docker compose` ile çalışır.

## Yeniden değerlendirme tetikleyicileri

- Müşteri sayısı ve birim maliyet, uyuyan konteyner ile bile hedef fiyatı karşılamıyorsa → "Lite" ADR'si.
- Pazaryerinde üçüncü taraf modüller ayrı süreçte veya sandbox'ta çalışabilir hale gelirse → B yeniden değerlendirilebilir.
