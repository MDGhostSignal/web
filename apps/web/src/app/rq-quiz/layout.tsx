import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Resonance Quotient",
  description:
    "Take the GhostSignal Resonance Quotient — a short values-based assessment that maps how you signal values, build trust, and approach partnerships.",
};

/**
 * Wraps every quiz sub-view with a persistent "back to home" pill in
 * the top-left corner, so a user can exit the quiz from any step
 * (intro / questions / results) without using the browser back button.
 * Styled via the `.rq-back-home` rule in rq-quiz.css, which is loaded
 * globally by the page's own import.
 */
export default function RQQuizLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Link href="/" className="rq-back-home" aria-label="Back to homepage">
        <span className="rq-back-home-arrow" aria-hidden="true">←</span>
        Home
      </Link>
      {children}
    </>
  );
}
