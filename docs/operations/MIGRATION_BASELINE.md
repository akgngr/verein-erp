# Veritabanı Migration Düzeni ve `db push` ile Kurulmuş Veritabanlarının Geçişi

> İlgili şartname maddesi: **A-1** (Güncelleme Teknik Şartnamesi)

## 1. Kural: şema değişikliği yalnızca migration ile yapılır

| Komut | Ne zaman |
|---|---|
| `pnpm db:migrate --name <değişiklik>` | Geliştirmede şema değiştiğinde. Oluşan `prisma/schema/migrations/<zaman>_<ad>/` klasörü **commit'lenir**. |
| `pnpm db:deploy` | Sunucuda / üretimde. `prisma migrate deploy` + bütünlük doğrulaması. Docker imajı bunu konteyner açılışında kendisi yapar. |
| `pnpm db:verify` | Bütünlüğü elle kontrol etmek için (migration'lar + koruma trigger'ları). |
| `pnpm db:push:dev` | **Yalnızca yerel deneme.** Üretimde (`NODE_ENV=production`) çalışmayı reddeder. |

**Neden `db push` kullanılmaz?**

1. Migration kaydı oluşturmaz. Üretimdeki `prisma migrate deploy` bu tabloları **hiç oluşturmaz**.
2. Migration'lardaki elle yazılmış SQL'i **uygulamaz**. Denetim kaydı, muhasebe fişleri ve bağış makbuzlarını silinmeye ve değiştirilmeye karşı koruyan PostgreSQL trigger'ları bu SQL'dedir. `db push` ile kurulmuş bir veritabanında bu kayıtlar silinebilir.

## 2. Veritabanım hangi durumda?

```bash
pnpm db:verify
```

- `OK — 10 triggers, 4 functions, all migrations applied.` → Bir şey yapmanız gerekmez.
- `Table "_prisma_migrations" not found` veya `Missing trigger: …` → Veritabanı `db push` ile kurulmuş. 3. bölümü uygulayın.
- `Migration not applied: …` → `pnpm db:deploy` çalıştırın.

## 3. `db push` ile kurulmuş veritabanını migration düzenine geçirme (tek seferlik)

> ⚠️ **Önce yedek alın.** Bu işlem tablo verilerine dokunmaz, ama yedeksiz yapılmamalı.

```bash
pg_dump -Fc -d "$DATABASE_URL" -f yedek-oncesi.dump
```

Ardından:

```bash
pnpm db:baseline -- --yes
```

Komutun yaptıkları:

1. `_prisma_migrations` zaten doluysa **hiçbir şey yapmadan çıkar**; baseline gerekmez.
2. Veritabanını `prisma/schema` ile karşılaştırır. **Fark varsa hiçbir şeyi değiştirmeden durur** ve farkı gösterir. Bu durumda farkı elle giderin (genellikle eski bir `db push` denemesinden kalan kolon) ve komutu tekrar çalıştırın.
3. Trigger migration'ı (`*_reassert_integrity_triggers`) dışındaki tüm migration'ları "uygulandı" olarak işaretler. Bu tablolar zaten var; işaretlenmezlerse tekrar oluşturulmaya çalışılır ve "already exists" hatası alınır.
4. `prisma migrate deploy` çalıştırır. Bu adımda yalnızca trigger migration'ı **gerçekten çalışır** ve korumaları kurar.
5. `db:verify` ile sonucu doğrular.

Bundan sonra her güncellemede yalnızca `pnpm db:deploy` (veya Docker imajının kendi açılış adımı) kullanılır.

## 4. Docker ile çalışan sunucular

Konteyner açılışında sırasıyla çalışır:

```
prisma migrate deploy  →  node scripts/verify-db-integrity.mjs  →  node server.js
```

Doğrulama başarısız olursa konteyner **başlamaz** ve log'da eksikler listelenir. Veritabanı `db push` ile kurulduysa, ilk açılışta `migrate deploy` "already exists" hatası verir. Bu durumda 3. bölümü konteyner dışından (veya `docker compose run --rm app sh` içinden) bir kez uygulayın.

## 5. Geliştiriciler için: `validate-module` kontrolü

`pnpm module:validate` artık şemadaki her tablo için bir migration'da `CREATE TABLE "<tablo>"` arar. Migration'ı olmayan tablo **hata** olarak raporlanır.
