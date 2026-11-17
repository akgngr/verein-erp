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

## Server-side bulk action sözleşmesi

Bulk action bir UI callback'i değildir; gerçek yetki ve kapsam server action içinde yeniden doğrulanır.

1. Action `createAction({ permission, schema, handler })` kullanır.
2. `selection`, `dataTableSelectionSchema` ile doğrulanır ve `parseBulkSelection(..., { allowedFilterKeys })` üzerinden geçer.
3. Query selection için istemciden gelen her filtre anahtarı whitelist içinde olmalıdır.
4. Modül tenant/organization kapsamı taşıyorsa scope istemciden güvenilir kabul edilmez; session/actor bağlamından server tarafında eklenir.
5. `mine` gibi kullanıcıya bağlı filtreler session kullanıcısı ile yeniden çözülür.
6. Soft-delete/retention/business-state koşulları modülün kendi query builder'ında korunur.
7. İşlem `audit` kaydı bırakır. En az `selectionType`, seçilen/güncellenen/atlanan adet ve hedef state/action kaydedilir; PII listesi audit metadata'ya kopyalanmaz.

Members ve Documents modülleri referans implementasyonlardır.

## Destructive işlemler

Silme, iptal, geri alınamaz arşivleme veya finansal etkili bulk action doğrudan çalışmaz. UI önce ortak `ConfirmDialog` ile kapsamı ve sonucu açıklar. Server action confirmation bilgisini bir güvenlik sınırı kabul etmez; permission ve business rule kontrollerini yine yapar.

## Request mi Automation mı?

Varsayılan karar:
- küçük, tek veritabanı içi ve birkaç saniye içinde tamamlanan toplu güncellemeler request içinde kalabilir;
- **500+ kayıt**, dosya üretimi, e-posta/dış API, ağır hesaplama veya yaklaşık **5 saniyeyi aşabilecek** işler Automation/Export pipeline'a taşınır;
- modül daha düşük eşik seçebilir; daha yüksek eşik için ölçüm ve gerekçe gerekir;
- worker girdisine tüm satırlar veya PII listesi değil, query/ID kapsamı ve gerekli metadata taşınır;
- worker çalışırken permission, tenant scope ve kaynak kayıt geçerliliği tekrar doğrulanır.

## Pilot kabulü

Members ve Documents listeleri aynı selection/bulk sözleşmesini kullanır. Quality Gate içindeki typecheck, lint, tests, build, hydration smoke ve theme acceptance bu iki pilotun regresyon kapısıdır.
