import type { Metadata } from "next";

/**
 * Local draft for the Notturno-inspired What Is This rebuild.
 * Unlinked from nav/sitemap. robots noindex even if accidentally deployed.
 */
export const metadata: Metadata = {
  title: "What is this (v2 draft)",
  description:
    "Local draft one-scroll GhostSignal story — Notturno-inspired structure. Not live.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function WhatIsThisV2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
