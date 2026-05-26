import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Conviction Index",
  description:
    "Take the GhostSignal Conviction Index — an advanced psychometric audit of the strategic convictions and lived business values driving your work.",
};

/**
 * Wraps every quiz sub-view with a persistent "back to home" pill in
 * the top-left corner. Mirrors the RQ quiz layout pattern.
 */
export default function XQQuizLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Link href="/" className="xq-back-home" aria-label="Back to homepage">
        <span className="xq-back-home-arrow" aria-hidden="true">←</span>
        Home
      </Link>
      {children}
    </>
  );
}
