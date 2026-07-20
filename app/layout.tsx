import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/nook/footer";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { dirFor } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n/context";
import { SpeedInsights } from "@vercel/speed-insights/next";

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

// viewport-fit=cover lets fixed bottom UI use env(safe-area-inset-*) so it
// clears the iPhone home indicator / notch. themeColor matches the cream canvas.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F5EFEB",
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
        <SpeedInsights />
      </body>
    </html>
  );
}
