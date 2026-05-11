import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/generated-tokens.css";
import "../styles/typography.css";
import "../styles/page-shell.css";
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
  title: {
    default: "GhostSignal — Values-based partnerships for podcasters and advertisers",
    template: "%s | GhostSignal",
  },
  description:
    "GhostSignal is a values-based podcast advertising network. We create partnerships between creators and brands who share soul — so every ad feels like an extension of the mission, not an interruption.",
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
  openGraph: {
    type: "website",
    siteName: "GhostSignal",
  },
  twitter: {
    card: "summary_large_image",
  },
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
