import type { Metadata } from "next";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

import { THEME_INIT_SCRIPT } from "@/shared/components/theme-provider";
import { Providers } from "./providers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  return {
    title: { default: t("appName"), template: t("appTitleTemplate") },
    description: t("appDescription"),
  };
}

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
      {/* Tarayıcı eklentileri (yazım asistanları vb.) body'ye öznitelik ekler (örn. data-writer-injected);
          yalnızca body'nin kendi özniteliklerindeki bu farkı yok sayar, alt ağaç denetlenmeye devam eder. */}
      <body className="min-h-dvh antialiased" suppressHydrationWarning>
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
