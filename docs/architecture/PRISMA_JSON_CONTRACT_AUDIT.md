# Prisma JSON Normalizasyonu ve structuredClone Semantik Denetimi

> **Durum:** Tamamlandı (Analiz ve Sözleşme Raporu)  
> **İlgili Görev:** Issue #330 (`[Gemini MW4] Prisma JSON normalizasyonu ve structuredClone semantik denetimi`)  
> **Sorumlu Ajan:** Gemini (Modern Web Standards & Runtime)  
> **Kapsam:** `automation` modülü (`execution-store.ts`, `task-worker.ts`, `workflow-runtime.ts`, `workflows.ts`), `emit.ts` ve Prisma 7 JSONB saklama sözleşmesi.

---

## 1. Yönetici Özeti ve Temel Karar

Bu denetim, kod tabanında yer alan `JSON.parse(JSON.stringify(...))` kalıplarının doğrudan/mekanik olarak `structuredClone(...)` ile değiştirilmesinin **neden sakıncalı olduğunu**, PostgreSQL `jsonb` ve Prisma 7 sözleşmesi açısından doğuracağı kırılmaları ortaya koymaktadır.

**Temel Sonuç:**  
`JSON.parse(JSON.stringify(...))` bir performans optimizasyonu değil, bir **JSONB normalizasyon ve filtreleme filtresidir**.  
Mekanik bir `structuredClone` değişimi yapılmamalıdır. Üretim kodu değiştirilmemiştir; gelecekte özel bir normalizasyon katmanı (utility) oluşturulmak istenirse izlenecek sözleşme ve sentetik testler bu dokümanla kayıt altına alınmıştır.

---

## 2. Semantik Karşılaştırma Matrisi

Aşağıdaki tablo Node.js 22 ve Prisma 7 çalışma zamanında `JSON.parse(JSON.stringify(x))` ile `structuredClone(x)` arasındaki kritik semantik farkları özetler:

| Veri Türü / Durum | `JSON.parse(JSON.stringify(x))` | `structuredClone(x)` | Prisma / PostgreSQL `jsonb` Etkisi |
| :--- | :--- | :--- | :--- |
| **`undefined` (Nesne alanı)** | Alan tamamen silinir (`omit`). | `undefined` korunur. | **Risk:** Prisma nesne içindeki `undefined` değerleri SQL'e aktarırken tutarsız davranabilir veya sürücü hatası üretir. |
| **`undefined` (Dizi elemanı)** | `null` değerine dönüştürülür (`[1, null, 2]`). | `undefined` korunur (`[1, undefined, 2]`). | **Kırılma:** JSON standardı (RFC 8259) dizide `undefined` tanımaz; veritabanına yazılamaz. |
| **`Date` nesnesi** | ISO-8601 dizgisine (`string`) çevrilir. | `Date` örneği (`instanceof Date`) olarak korunur. | **Kırılma:** DB'ye yazılıp okunduğunda `string` döner. Bellekteki `Date` ile DB'den dönen `string` eşitlik ve idempotency kontrollerinde uyuşmazlık yaratır. |
| **`BigInt` (`100n`)** | `TypeError` fırlatır (JSON desteklemez). | `BigInt` olarak klonlanır. | **Risk:** JSONB sütunu yerel BigInt saklamaz; DB yazımında hata oluşur. |
| **`NaN` ve `Infinity`** | `null` değerine normalize edilir. | `NaN` ve `Infinity` korunur. | **Kırılma:** PostgreSQL `jsonb` ayrıştırıcısı `NaN` ve `Infinity` değerlerini reddeder (`22P02 invalid input syntax for type json`). |
| **Fonksiyonlar / Metodlar** | Sessizce göz ardı edilir / silinir. | `DataCloneError` fırlatır ve işlemi durdurur. | **Kırılma:** Geliştirici veya kütüphane payload içine callback/helper koyarsa worker tamamen çöker. |
| **Semboller (`Symbol`)** | Sessizce silinir. | `DataCloneError` fırlatır. | Worker çökmesine yol açar. |
| **Döngüsel Referanslar** | `TypeError: Converting circular structure to JSON`. | Döngüsel referansı koruyarak klonlar. | JSONB sütununa döngüsel veri yazılamaz; DB seviyesinde serialization hatası doğurur. |
| **`null` değeri** | `null` olarak kalır. | `null` olarak kalır. | Prisma'da `Prisma.JsonNull` ile `Prisma.DbNull` ayrımı gereklidir. |

---

## 3. Prisma 7 JSONB Saklama Sözleşmesi

PostgreSQL `jsonb` sütunları için Prisma üç farklı `null` semantiği tanımlar:

1. **`Prisma.DbNull`:**  
   Veritabanındaki sütunun kendisine SQL `NULL` yazar. (Sütunda JSON verisi yoktur).
2. **`Prisma.JsonNull`:**  
   Sütunda JSON `'null'` metnini saklar (JSONB değeri `null` olan geçerli bir JSON belgesi).
3. **`undefined`:**  
   Prisma sorgusunda bu alanın `UPDATE` veya `CREATE` ifadesine hiç dahil edilmeyeceğini (omit) belirtir.

### Kod Tabanındaki Mevcut Kullanım Örneği
`src/modules/automation/services/task-worker.ts`:
```typescript
const storedResult = result == null
  ? Prisma.JsonNull
  : JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue;
```
Bu kullanım bilinçli bir mimari tercihtir:
- Eğer görev sonucu `null` veya `undefined` ise, DB'de JSONB `null` saklamak için `Prisma.JsonNull` atanır.
- Eğer görev sonucu bir nesne ise, `JSON.parse(JSON.stringify(result))` ile tüm `undefined`, fonksiyon, `NaN` gibi kirleticiler elenir ve RFC 8259 uyumlu saf bir `Prisma.InputJsonValue` elde edilir.

---

## 4. Tenant İzolasyonu, Denetim (Audit) ve Retry Etkileri

### 4.1 Tenant İzolasyonu
Otomasyon motoru (`automationExecution`), kiracı bağlamını (`context: { tenantId, ... }`) JSONB olarak saklar.  
Eğer `structuredClone` kullanılsaydı ve kiracıdan gelen bir parametrede klonlanamayan bir tür (örneğin bir handler fonksiyonu veya getter) bulunsaydı, `structuredClone` worker sürecinde yakalanmamış istisna (`DataCloneError`) üreterek kuyruk işleyicisini çökertebilir ve hizmet kesintisine (DoS) yol açabilirdi. `JSON.stringify` ise güvenli bir biçimde yabancı alanları eler.

### 4.2 Denetim İzi (Audit Trail) ve Determinizm
Denetim kayıtları (`AuditLog`) ve otomasyon adım kayıtları (`automationStepRun`), payload'ın deterministik hash'ine ve diff'ine dayanır.  
`JSON.parse(JSON.stringify(...))` kullanımı, alanların serileştirme davranışını standartlaştırır. `Date` nesnelerinin ISO dizgisine dönüşmesi, denetim loglarının zaman damgası karşılaştırmalarında tutarlılık sağlar.

### 4.3 Idempotency ve Task Retry
Bir görev yeniden denendiğinde (`attempt > 1`):
1. İlk çalıştırmada bellek içi nesne kullanılır.
2. İkinci çalıştırmada (veya çökme sonrası kurtarmada) veri veritabanından (`JSONB`) okunur.
Eğer bellekte `Date` veya `undefined` tutulup DB'ye yazılırsa, DB'den okunduğunda `Date` yerine `string`, `undefined` alanları yerine ise eksik anahtarlar gelecektir. Bu durum, ilk çalıştırma ile yeniden deneme (retry) arasında **davranış sapmasına (state drift)** yol açar. `JSON.parse(JSON.stringify(...))` bu sapmayı ilk anda eşitleyerek determinizmi garanti eder.

---

## 5. Öneriler ve Sonuç

1. **Üretim Kodunu Değiştirmeme:**  
   `src/modules/automation/services/` altındaki `JSON.parse(JSON.stringify(...))` kullanımları güvenli, amaca uygun ve mimari açıdan doğrudur. Mekanik olarak `structuredClone`'a çevrilmemelidir.
2. **Gelecek İyileştirme (Teknik Borç Notu):**  
   İlerleyen dönemde performans optimizasyonu gerekirse (büyük JSON payload'ları için V8 serileştirme yükünü azaltmak amacıyla), `structuredClone` yerine `undefined` ve `Date` alanlarını güvenle denetleyen bir `safeJsonNormalize<T>(input: T): Prisma.InputJsonValue` yardımcı fonksiyonu tasarlanmalı ve koordinatör onaylı ayrı bir Issue altında ele alınmalıdır.
3. **Sözleşme Doğrulama:**  
   Bu analiz, `tests/shared/prisma-json-contract.test.ts` test süiti ile otomatikleştirilmiş ve tüm sınır durumlar doğrulanmıştır.
