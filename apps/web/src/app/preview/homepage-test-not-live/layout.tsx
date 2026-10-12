import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Homepage test — not live",
  robots: { index: false, follow: false },
};

export default function HomepageTestNotLiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
