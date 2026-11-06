import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "With Whom Do You Belong?",
  description:
    "The GHOSTSignal Conviction Quotient (XQ) names your values and partnership style, then compares them with a potential partner.",
  robots: { index: false, follow: false },
};

export default function XqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
