"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

/**
 * Liste ekranlarının URL query durumunu güncelleyen ortak hook (Faz 1, izinli ekleme).
 *
 * DataTable bunu kendi içinde kullanır; modüller de kendi filtre kontrollerini
 * (tarih aralığı, sekmeler, anahtarlar vb.) aynı hook ile yazar — böylece tüm
 * filtreler tek bir URL kaynağında birleşir.
 *
 * KARAR: Değer `null`, `undefined` veya boş string ise parametre URL'den SİLİNİR
 * (filtre temizleme); `page` ayrıca `resetPage` ile silinerek liste 1. sayfaya döner.
 */
export function useListQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const setParams = useCallback(
    (
      partial: Record<string, string | number | null | undefined>,
      options?: { resetPage?: boolean },
    ) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(partial)) {
        if (value === null || value === undefined || value === "") params.delete(key);
        else params.set(key, String(value));
      }
      if (options?.resetPage) params.delete("page");
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  return { setParams, isPending };
}
