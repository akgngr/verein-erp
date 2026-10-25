import { z } from "zod";

export type ListSortDir = "asc" | "desc";

export type ListPageSize = 10 | 25 | 50;

export type ListParams<FilterKey extends string = string> = {
  page: number;
  pageSize: ListPageSize;
  q: string;
  sort: string;
  dir: ListSortDir;
  filters: Partial<Record<FilterKey, string>>;
  skip: number;
  take: number;
};

/** Modül sorgularının standart dönüşü: Prisma findMany + count sonucu. */
export type ListResult<Row> = {
  rows: Row[];
  total: number;
  page: number;
  pageSize: number;
};

/** Next.js 16: `searchParams` Promise döner; await sonrası bu tip kullanılır. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

export type ListParamsOptions<FilterKey extends string = string> = {
  sortableFields: readonly string[];
  defaultSort: string;
  /** KARAR: azalan varsayılan sıralama gerektiren listeler (örn. denetim kaydı) için. */
  defaultDir?: ListSortDir;
  filterKeys?: readonly FilterKey[];
};

const PAGE_SIZE_OPTIONS: readonly number[] = [10, 25, 50];

function first(searchParams: RawSearchParams, key: string): string | undefined {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * URL query parametrelerini zod ile doğrulayıp güvenli liste parametrelerine çevirir.
 * Geçersiz değerler sessizce varsayılana döner; sıralama alanı izinli listede
 * yoksa varsayılan sıralama kullanılır.
 */
export function parseListParams<FilterKey extends string = string>(
  searchParams: RawSearchParams,
  options: ListParamsOptions<FilterKey>,
): ListParams<FilterKey> {
  const page = z.coerce.number().int().min(1).catch(1).parse(first(searchParams, "page"));

  const pageSizeRaw = z.coerce.number().int().catch(10).parse(first(searchParams, "pageSize"));
  const pageSize: ListPageSize = PAGE_SIZE_OPTIONS.includes(pageSizeRaw)
    ? (pageSizeRaw as ListPageSize)
    : 10;

  const q = z.string().trim().max(100).catch("").parse(first(searchParams, "q") ?? "");

  const dir = z
    .enum(["asc", "desc"])
    .catch(options.defaultDir ?? "asc")
    .parse(first(searchParams, "dir"));

  const sortRaw = first(searchParams, "sort") ?? "";
  const sort = options.sortableFields.includes(sortRaw) ? sortRaw : options.defaultSort;

  const filters: Partial<Record<FilterKey, string>> = {};
  for (const key of options.filterKeys ?? []) {
    const value = first(searchParams, `filter.${key}`);
    if (value) filters[key] = value;
  }

  return {
    page,
    pageSize,
    q,
    sort,
    dir,
    filters,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
