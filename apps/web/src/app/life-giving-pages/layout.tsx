import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Life Giving Pages — Brand Proposal | GHOSTSignal",
  description:
    "Internal review: brand strategy, visual identity, website + platform assets proposal for Jessica Hadden and Life Giving Pages.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LifeGivingPagesProposalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Keep a single scrollbar on the deck stage — kill the document gutter. */}
      <style>{`
        html,
        body {
          height: 100% !important;
          overflow: hidden !important;
          scrollbar-gutter: auto !important;
        }
      `}</style>
      {children}
    </>
  );
}
