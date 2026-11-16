import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Multi-Consciência 15 — Conselho de Inteligências",
  description: "Um conselho de inteligências artificiais independentes para pensar, debater e decidir com você.",
  applicationName: "Multi-Consciência 15"
};

export const viewport: Viewport = {
  themeColor: "#080b14",
  colorScheme: "dark"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}