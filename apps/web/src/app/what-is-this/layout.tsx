import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "What is this",
  description:
    "The values-based podcast advertising network. We create partnerships that feel good because they are good — shared soul, shared trust, real resonance.",
};

export default function WhatIsThisLayout({ children }: { children: React.ReactNode }) {
  return children;
}
