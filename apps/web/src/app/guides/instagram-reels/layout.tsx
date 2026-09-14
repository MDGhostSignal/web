import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Instagram Reels Guide",
  description:
    "GHOSTSignal partner basics for posting Instagram Reels — hooks, structure, timing, captions, and CTAs without needing to be a social media expert.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function InstagramReelsGuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
