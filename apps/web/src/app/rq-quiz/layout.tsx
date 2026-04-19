import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resonance Quotient",
  description:
    "Take the GhostSignal Resonance Quotient — a short values-based assessment that maps how you signal values, build trust, and approach partnerships.",
};

export default function RQQuizLayout({ children }: { children: React.ReactNode }) {
  return children;
}
