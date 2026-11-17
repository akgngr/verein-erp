# ERP DataTable ve Bulk Interaction Standardı

**Tarih:** 2026-11-17

Mevcut `src/shared/components/data-table` ERP'nin tek ortak liste/tablo altyapısıdır.

## Hedef

- server-side search/filter/sort/pagination
- row actions
- multiple selection
- page select-all
- query select-all
- ortak BulkActionBar
- keyboard/ARIA erişilebilirliği
- mobile uyumu
- güvenli server-side bulk action sözleşmesi

## Selection türleri

```ts
type DataTableSelection =
  | { type: "explicit"; ids: string[] }
  | {
      type: "query";
      query: {
        q?: string;
        filters: Record<string, string>;
        sort?: string;
        dir?: "asc" | "desc";
      };
      excludedIds?: string[];
    };
```

Explicit seçim mevcut sayfadaki ID'leri taşır. Query seçiminde tüm ID'ler istemciye taşınmaz; sunucu filtre snapshot'ını yeniden çözer.

## Bulk action kuralları

- Yetki server tarafında yeniden kontrol edilir.
- Tenant/organization kapsamı server tarafında doğrulanır.
- Destructive işlem confirmation ister.
- İşlem audit izi bırakır.
- Büyük işler Automation/Export pipeline'a devredilir.
- UI iş mantığını bilmez; modül yalnızca izin verilen action tanımlarını verir.

## UX

Selection aktif olduğunda ortak BulkActionBar görünür. Seçili satır semantic selected surface ile vurgulanır ve motion tokenları kullanılır.

Query seçiminde kullanıcıya önce sayfa kapsamı, ardından tüm filtre sonucu açıkça anlatılır.

## Performans

Binlerce ID browser'a taşınmaz. Pagination değişiminde selection davranışı açık ve testlidir.
