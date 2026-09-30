import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: { default: "MACNO Enterprise LLC — Automated Loan Underwriting", template: "%s | MACNO Enterprise" },
  description:
    "Automated underwriting and prequalification for residential, investment, commercial, construction, land and construction-to-permanent loans. Mortgage solutions & construction support, all in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
