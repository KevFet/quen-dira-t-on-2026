import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Qu’en dira-t-on ? - Edition 2026",
  description: "Le jeu de déduction coopératif ultra-moderne.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <div className="space-mesh" />
        {children}
      </body>
    </html>
  );
}
