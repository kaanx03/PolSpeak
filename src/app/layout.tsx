import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/contexts/ToastContext";
import { LibraryProvider } from "@/contexts/LibraryContext";
import AuthGuard from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "PolSpeak - Learn Polish with Passion",
  description: "Interactive Polish language learning platform with lessons, vocabulary, and progress tracking",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PolSpeak",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [
      { url: "/favicon/apple-icon-57x57.png", sizes: "57x57", type: "image/png" },
      { url: "/favicon/apple-icon-60x60.png", sizes: "60x60", type: "image/png" },
      { url: "/favicon/apple-icon-72x72.png", sizes: "72x72", type: "image/png" },
      { url: "/favicon/apple-icon-76x76.png", sizes: "76x76", type: "image/png" },
      { url: "/favicon/apple-icon-114x114.png", sizes: "114x114", type: "image/png" },
      { url: "/favicon/apple-icon-120x120.png", sizes: "120x120", type: "image/png" },
      { url: "/favicon/apple-icon-144x144.png", sizes: "144x144", type: "image/png" },
      { url: "/favicon/apple-icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/favicon/apple-icon-180x180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#00132c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />

        {/* PWA Meta Tags */}
        <meta name="application-name" content="PolSpeak" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* iOS Specific PWA Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="PolSpeak" />

        {/* Splash Screens for iPad */}
        <link rel="apple-touch-startup-image" href="/logo.png" />

        {/* Theme Color */}
        <meta name="theme-color" content="#00132c" />
        <meta name="msapplication-navbutton-color" content="#00132c" />
        <meta name="msapplication-TileColor" content="#00132c" />
        <meta name="msapplication-config" content="/favicon/browserconfig.xml" />
      </head>
      <body className="bg-bg-main text-text-main antialiased">
        <AuthGuard>
          <ToastProvider>
            <LibraryProvider>{children}</LibraryProvider>
          </ToastProvider>
        </AuthGuard>
      </body>
    </html>
  );
}
