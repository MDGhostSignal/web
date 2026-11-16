import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "With Whom Do You Belong? | GHOSTSignal",
  description:
    "A preview of the new XQ — Part One and Part Two — coming soon. Leave your email to get notified when it goes live.",
  robots: { index: true, follow: true },
};

export default function XqPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
