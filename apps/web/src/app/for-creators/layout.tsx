import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "For Creators",
  description:
    "Your podcast is cultural architecture. GhostSignal protects your voice, honours your audience, and connects you with advertisers whose values align with your mission.",
};

export default function ForCreatorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
