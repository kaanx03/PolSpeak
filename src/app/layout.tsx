import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/contexts/ToastContext";
import { LibraryProvider } from "@/contexts/LibraryContext";
import AuthGuard from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "PolSpeak - Teaching Toolkit",
  description: "Polish language teaching platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
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
