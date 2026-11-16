"use client";

import { Card, Drawer, Description, buttonVariants } from "@heroui/react";
import { actionVariant } from "../ui/action-appearance";
import { cn } from "@/shared/utils";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * Form standardı: oluşturma/düzenleme formları sağdan açılan çekmecede gösterilir.
 *
 * KARAR: Çekmecenin açık olması URL'de tutulur — liste sayfasında `?yeni` veya
 * `?duzenle=<id>`, detay sayfasında `?duzenle`. Böylece bağlantı paylaşılabilir,
 * geri tuşu çekmeceyi kapatır ve sunucu bileşeni formun verisini kendisi yükler.
 * Kapatınca yalnızca bu parametreler silinir; liste filtreleri korunur.
 * Mobilde çekmece tam ekran açılır.
 */
export const FORM_DRAWER_PARAMS = ["yeni", "duzenle"] as const;

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
          <Drawer.Content placement="right">
            <Drawer.Dialog
              className={cn(
                "h-full max-h-dvh w-screen max-w-full rounded-none sm:rounded-l-xl",
                {
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
              <Drawer.CloseTrigger />
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
      className={buttonVariants({
        size: "sm",
        variant: actionVariant(color, variant),
      })}
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
    <Card className={cn("border border-ink-200/80 shadow-sm", className)}>
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
