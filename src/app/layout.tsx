import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Planet Movil",
  description: "Gestión de stock, ventas y constancias — Planet Movil y Soluciones Móviles",
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = { themeColor: "#1e3a8a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
