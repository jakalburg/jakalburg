import { SessionProvider } from "@/components/providers/session-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { DeliveryProvider } from "@/lib/delivery-context";
import "@/lib/suppress-hydration-warnings";
import { AgentationProvider } from "@/components/providers/agentation-provider";
import { PwaProvider } from "@/components/providers/pwa-provider";
import { ErrorBoundary } from "@/components/common/error-boundary";

export const metadata: Metadata = {
  title: "Jakalburg Admin",
  description: "Jakalburg store administration",
  manifest: "/manifest.webmanifest",
  applicationName: "Jakalburg Admin",
  appleWebApp: {
    capable: true,
    title: "Jakalburg",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  robots: "noindex, nofollow",
};

export const viewport: Viewport = {
  themeColor: "#1d0441",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`antialiased`}>
        <SessionProvider>
          <QueryProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem
              disableTransitionOnChange
            >
              <DeliveryProvider>
                <ErrorBoundary>
                  {children}
                  <Toaster />
                  <AgentationProvider />
                  <PwaProvider />
                </ErrorBoundary>
              </DeliveryProvider>
            </ThemeProvider>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
