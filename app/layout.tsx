import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/nook/footer";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { dirFor } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n/context";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nook: Verified student rentals in the Klang Valley",
  description:
    "Find verified student rooms, studios and apartments near UM, UKM, UPM, UiTM, MMU, Sunway and more.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      className={`${geist.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider dict={dict} locale={locale}>
          <main className="flex-1">{children}</main>
          <Footer dict={dict} />
        </I18nProvider>
      </body>
    </html>
  );
}
