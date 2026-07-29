import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { config } from "@/infrastructure/config";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const baseUrl = config.baseUrl;

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Lensa — Satu Peristiwa, Semua Sudut Pandang",
    template: "%s · Lensa",
  },
  description:
    "Gateway berita Indonesia: satu peristiwa dari banyak portal dibandingkan berdampingan — ringkasan netral, perspektif tiap sumber, dan blindspot-nya.",
  openGraph: {
    type: "website",
    siteName: "Lensa",
    title: "Lensa — Satu Peristiwa, Semua Sudut Pandang",
    description:
      "Gateway berita Indonesia: satu peristiwa dari banyak portal dibandingkan berdampingan — ringkasan netral, perspektif tiap sumber, dan blindspot-nya.",
    url: baseUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Lensa — Satu Peristiwa, Semua Sudut Pandang",
    description:
      "Gateway berita Indonesia: satu peristiwa dari banyak portal dibandingkan berdampingan.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-40 h-14 border-b border-stone-200 bg-stone-50/90 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90" />
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
        <ThemeProvider>
          <Suspense fallback={<HeaderSkeleton />}>
            <SiteHeader />
          </Suspense>
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
