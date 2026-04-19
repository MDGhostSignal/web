import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/generated-tokens.css";
import "../styles/typography.css";
import "./globals.css";
import { Providers } from "@/app/providers";

// Inter is used for both heading and body copy. Load it once and expose
// the same font under two CSS variables so downstream CSS can keep the
// heading/body distinction without fetching the file twice.
const inter = Inter({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  display: "swap",
  variable: "--font-body",
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
        className={`${inter.variable} bg-background text-foreground antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
