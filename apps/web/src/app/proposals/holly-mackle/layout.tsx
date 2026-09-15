import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Holly Mackle — Brand Proposal | GHOSTSignal",
  description:
    "Internal review: brand strategy, visual identity, website + platform assets proposal for Holly Mackle.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function HollyMackleProposalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
