import { WebVitalsReporter } from "@/components/observability/web-vitals-reporter";
import { DevPerformanceShim } from "@/components/observability/dev-performance-shim";
import { ThemeInit } from "@/components/theme-init";
import { Toaster } from "@/components/ui/toaster";
import type { Metadata } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${geist.variable} ${instrumentSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <DevPerformanceShim />
          <WebVitalsReporter />
          <ThemeInit />
          <Toaster />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
