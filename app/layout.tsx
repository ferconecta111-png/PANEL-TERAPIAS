import type { Metadata, Viewport } from "next";
import { Archivo, Inter } from "next/font/google";
import "./globals.css";

/**
 * Tipografía del panel: display Archivo + body Inter — mismo par que usa el
 * panel closer de vsl-platform (ver components/admin/ui/fuentes.ts ahí),
 * auto-hospedadas con next/font (sin request a Google Fonts en runtime).
 */
const archivo = Archivo({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-archivo",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Panel de Terapeutas",
  description: "Panel de administración para las terapeutas.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Panel de Terapeutas",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      data-panel="vsl"
      data-theme="panel-light"
      className={`${archivo.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
