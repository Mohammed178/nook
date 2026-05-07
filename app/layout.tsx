import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/nook/footer";
import { TweaksInit } from "@/components/nook/tweaks-init";
import { TweaksPanel } from "@/components/nook/tweaks-panel";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nook — Verified student rentals in the Klang Valley",
  description:
    "Find verified student rooms, studios and apartments near UM, UKM, UPM, UiTM, MMU, Sunway and more.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <head>
        <TweaksInit />
      </head>
      <body className="min-h-full flex flex-col">
        <main className="flex-1">{children}</main>
        <Footer />
        <TweaksPanel />
      </body>
    </html>
  );
}
