"use client";

import { Toast } from "@heroui/react";
import { I18nProvider, RouterProvider } from "react-aria-components";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { ThemeProvider } from "@/shared/components/theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const locale = useLocale() === "de" ? "de-DE" : "tr-TR";
  return (
    <I18nProvider locale={locale}>
      <RouterProvider navigate={(href) => router.push(href)}>
        <ThemeProvider>
          <Toast.Provider placement="top" />
          {children}
        </ThemeProvider>
      </RouterProvider>
    </I18nProvider>
  );
}
