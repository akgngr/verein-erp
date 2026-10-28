"use client";

import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { useRouter } from "next/navigation";

import { ThemeProvider } from "@/shared/components/theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <HeroUIProvider locale="tr-TR" navigate={router.push}>
      <ThemeProvider>
        <ToastProvider placement="top-center" />
        {children}
      </ThemeProvider>
    </HeroUIProvider>
  );
}
