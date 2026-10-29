"use client";

import { Button, Card, CardBody, Drawer, DrawerBody, DrawerContent, DrawerHeader } from "@heroui/react";
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

/**
 * Çekmece görünümü (tek kaynak): kendi açık/kapalı durumunu yöneten formlar
 * (ör. isOpen/onClose alan bileşenler) da aynı yerleşimi kullanır.
 */
export const FORM_DRAWER_PROPS = {
  placement: "right",
  scrollBehavior: "inside",
  classNames: { base: "max-sm:!max-w-full max-sm:!w-full" },
} as const;

const FormDrawerContext = createContext<(() => void) | null>(null);

/** Çekmece içindeyse kapatma fonksiyonu; değilse null (form sayfada kullanılıyor). */
export function useFormDrawerClose(): (() => void) | null {
  return useContext(FormDrawerContext);
}

export function FormDrawer({
  title,
  description,
  children,
  size = "2xl",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  size?: "md" | "lg" | "xl" | "2xl" | "3xl";
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
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <FormDrawerContext.Provider value={close}>
      <Drawer
        isOpen={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) close();
        }}
        {...FORM_DRAWER_PROPS}
        size={size}
      >
        <DrawerContent>
          <DrawerHeader className="flex flex-col gap-1 border-b border-default-200/80">
            <span className="text-large font-semibold">{title}</span>
            {description ? <span className="text-small font-normal text-default-500">{description}</span> : null}
          </DrawerHeader>
          <DrawerBody className="py-5">{children}</DrawerBody>
        </DrawerContent>
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
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
  variant?: "solid" | "bordered" | "light" | "flat" | "faded" | "ghost" | "shadow";
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const next = new URLSearchParams(searchParams.toString());
  next.set(param, value);
  return (
    <Button
      as={Link}
      href={`${pathname}?${next.toString()}`}
      scroll={false}
      color={color}
      size="sm"
      variant={variant}
      startContent={startIcon}
    >
      {children}
    </Button>
  );
}

/** Form kabı: sayfada kart, çekmece içinde çerçevesiz (çekmece zaten bir yüzeydir). */
export function FormSurface({ children, className }: { children: ReactNode; className?: string }) {
  const inDrawer = useContext(FormDrawerContext) !== null;
  if (inDrawer) return <div className="flex flex-col gap-4">{children}</div>;
  return (
    <Card shadow="sm" className={className}>
      <CardBody className="gap-4 p-6">{children}</CardBody>
    </Card>
  );
}

/** İstemci tablolarının satır eylemleri için: mevcut sorguyu koruyan çekmece bağlantısı. */
export function useFormDrawerHref(): (param: (typeof FORM_DRAWER_PARAMS)[number], value?: string) => string {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (param, value = "") => {
    const next = new URLSearchParams(searchParams.toString());
    next.set(param, value);
    return `${pathname}?${next.toString()}`;
  };
}
