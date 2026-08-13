import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "XQ + RQ — With Whom Do You Belong?",
  description:
    "Discover your values to find your perfect partner. The XQ codifies your business's moral framework; the RQ reveals what kind of partner you are — so you connect with the people most aligned to your objectives.",
};

export default function XqRqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
