import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GEN | Premium Event OS",
  description: "Plataforma premium para fiestas, boletos QR, pagos y control de acceso."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
