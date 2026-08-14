import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://jo-travel-hub.vercel.app"),
  title: "Jo Travel Hub - 隨身旅遊助理",
  description: "多旅程行程規劃與隨身助理 Portal",
  icons: {
    icon: "/icon",
    apple: "/apple-icon",
  },
  openGraph: {
    title: "Jo Travel Hub - 隨身旅遊助理",
    description: "多旅程行程規劃與隨身助理 Portal",
    images: [{ url: "/apple-icon", width: 180, height: 180, alt: "Jo Travel Hub Logo" }],
  },
  twitter: {
    card: "summary",
    title: "Jo Travel Hub - 隨身旅遊助理",
    description: "多旅程行程規劃與隨身助理 Portal",
    images: ["/apple-icon"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hant"
      className={`${inter.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50 text-slate-800 font-sans selection:bg-slate-800 selection:text-white">
        {children}
      </body>
    </html>
  );
}
