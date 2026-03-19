import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/generated-tokens.css";
import "../styles/typography.css";
import "./globals.css";
import { Providers } from "@/app/providers";

const displayFont = Inter({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
});

const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
});

export const metadata: Metadata = {
  title: "Ghost Signal",
  description: "High-performance website with cinematic visuals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${displayFont.variable} ${bodyFont.variable} bg-background text-foreground antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
