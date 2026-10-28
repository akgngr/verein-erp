import type { Metadata } from "next";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";

import { THEME_INIT_SCRIPT } from "@/shared/components/theme-provider";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Dernek Yönetim Sistemi",
    template: "%s | Dernek Yönetim Sistemi",
  },
  description: "Dernek yönetim sistemi: evrak kayıt, toplantılar ve üye yönetimi.",
};

/**
 * Faz 3 eklemeleri düzeltmesi: members modülünün client bileşenleri
 * useTranslations kullanır; non-routing next-intl modunda client context'i
 * için NextIntlClientProvider ZORUNLUDUR (RSC'de render edilip mesajları
 * serileştirir). Dil kaynağı NEXT_LOCALE çerezi — bkz. src/i18n/request.ts.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body className="min-h-dvh antialiased">
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
