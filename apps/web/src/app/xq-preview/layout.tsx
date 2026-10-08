import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "XQ preview | GHOSTSignal",
  description: "Team preview of the XQ hub. Not the live page.",
  robots: { index: false, follow: false },
};

export default function XqPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
