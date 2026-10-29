"use client";

import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

import { ThemeProvider } from "@/shared/components/theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // Tarih seçici, takvim ve sayı biçimleri arayüz diliyle aynı yerel ayarı kullanır.
  const locale = useLocale() === "de" ? "de-DE" : "tr-TR";

  return (
    <HeroUIProvider locale={locale} navigate={router.push}>
      <ThemeProvider>
        <ToastProvider placement="top-center" />
        {children}
      </ThemeProvider>
    </HeroUIProvider>
  );
}
