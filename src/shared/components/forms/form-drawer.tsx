"use client";

import { Card, Drawer, Description, buttonVariants } from "@heroui/react";
import { DialogDismissButton } from "../ui/dialog-dismiss-button";
import { actionVariant } from "../ui/action-appearance";
import { useDrawerPlacement } from "@/shared/hooks/use-media-query";
import { cn } from "@/shared/utils";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * Form standardı: oluşturma/düzenleme formları çekmecede gösterilir (masaüstü sağ, mobil alt).
 *
 * KARAR: Çekmecenin açık olması URL'de tutulur — liste sayfasında `?yeni` veya
 * `?duzenle=<id>`, detay sayfasında `?duzenle`. Böylece bağlantı paylaşılabilir,
 * geri tuşu çekmeceyi kapatır ve sunucu bileşeni formun verisini kendisi yükler.
 * Kapatınca yalnızca bu parametreler silinir; liste filtreleri korunur.
 * Masaüstünde sağdan, mobilde alttan (bottom sheet, en çok ekranın %92'si) açılır.
 */
export const FORM_DRAWER_PARAMS = ["yeni", "duzenle"] as const;

/** Mobil alt panel: tam genişlik, üst köşeler yuvarlak, içerik kadar uzar (en çok %92 ekran). */
export const BOTTOM_SHEET_CLASS = "flex max-h-[92dvh] w-screen max-w-full flex-col rounded-t-2xl rounded-b-none pb-[env(safe-area-inset-bottom)]";

/** Çekmece kabının sınıfı: masaüstünde sağ panel (verilen azami genişlikle), mobilde alt panel. */
export function drawerDialogClass(placement: "right" | "bottom", desktopWidth: string): string {
  return placement === "bottom" ? BOTTOM_SHEET_CLASS : cn("h-full max-h-dvh w-screen max-w-full rounded-none sm:rounded-l-xl", desktopWidth);
}

/** Alt panelin üstündeki tutamak çizgisi (görsel ipucu; kapatma için dış alana dokunma ya da × kullanılır). */
export function SheetHandle() {
  return <div aria-hidden className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-ink-300/80" />;
}

const FormDrawerContext = createContext<(() => void) | null>(null);

/** Çekmece içindeyse kapatma fonksiyonu; değilse null (form sayfada kullanılıyor). */
export function useFormDrawerClose(): (() => void) | null {
  return useContext(FormDrawerContext);
}

export function FormDrawer({
  title,
  description,
  children,
  size = "3xl",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  /** Varsayılan 3xl (≈768 px); çok sütunlu formlar (ör. fatura kalemleri) 4xl/5xl ister. */
  size?: "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(true);
  const placement = useDrawerPlacement();

  const close = () => {
    setOpen(false);
    const next = new URLSearchParams(searchParams.toString());
    for (const key of FORM_DRAWER_PARAMS) next.delete(key);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  return (
    <FormDrawerContext.Provider value={close}>
      <Drawer>
        <Drawer.Backdrop
          isOpen={open}
          onOpenChange={(isOpen) => {
            if (!isOpen) close();
          }}
        >
          <Drawer.Content placement={placement}>
            <Drawer.Dialog
              className={cn(
                placement === "bottom"
                  ? BOTTOM_SHEET_CLASS
                  : "h-full max-h-dvh w-screen max-w-full rounded-none sm:rounded-l-xl",
                placement === "right" && {
                  md: "sm:max-w-md",
                  lg: "sm:max-w-lg",
                  xl: "sm:max-w-xl",
                  "2xl": "sm:max-w-2xl",
                  "3xl": "sm:max-w-3xl",
                  "4xl": "sm:max-w-4xl",
                  "5xl": "sm:max-w-5xl",
                }[size],
              )}
            >
              {placement === "bottom" ? <SheetHandle /> : null}
              <DialogDismissButton drawer />
              <Drawer.Header className="border-b border-ink-200/80 pb-5">
                <Drawer.Heading>{title}</Drawer.Heading>
                {description ? <Description>{description}</Description> : null}
              </Drawer.Header>
              <Drawer.Body className="min-h-0 flex-1 overflow-y-auto py-6">
                {children}
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </FormDrawerContext.Provider>
  );
}

/**
 * Çekmeceyi açan buton: mevcut sorgu parametrelerini (filtre, sayfa) koruyarak
 * `?yeni` veya `?duzenle=<id>` ekler. Sunucu view'larının PageHeader aksiyonu içindir.
 */
export function FormDrawerButton({
  param,
  value = "",
  children,
  startIcon,
  color = "primary",
  variant = "solid",
}: {
  param: (typeof FORM_DRAWER_PARAMS)[number];
  value?: string;
  children: ReactNode;
  startIcon?: ReactNode;
  color?:
    "default" | "primary" | "secondary" | "success" | "warning" | "danger";
  variant?:
    "solid" | "bordered" | "light" | "flat" | "faded" | "ghost" | "shadow";
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const next = new URLSearchParams(searchParams.toString());
  next.set(param, value);
  return (
    <Link
      href={`${pathname}?${next.toString()}`}
      scroll={false}
      className={cn("erp-motion-interactive", buttonVariants({
        size: "sm",
        variant: actionVariant(color, variant),
      }))}
    >
      {startIcon}
      {children}
    </Link>
  );
}

/** Form kabı: sayfada kart, çekmece içinde çerçevesiz (çekmece zaten bir yüzeydir). */
export function FormSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const inDrawer = useContext(FormDrawerContext) !== null;
  if (inDrawer) return <div className="flex flex-col gap-4">{children}</div>;
  return (
    <Card className={cn("erp-motion-enter erp-motion-interactive border border-ink-200/80 shadow-sm hover:shadow-md", className)}>
      <Card.Content className="gap-4 p-6">{children}</Card.Content>
    </Card>
  );
}

/** İstemci tablolarının satır eylemleri için: mevcut sorguyu koruyan çekmece bağlantısı. */
export function useFormDrawerHref(): (
  param: (typeof FORM_DRAWER_PARAMS)[number],
  value?: string,
) => string {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (param, value = "") => {
    const next = new URLSearchParams(searchParams.toString());
    next.set(param, value);
    return `${pathname}?${next.toString()}`;
  };
}
