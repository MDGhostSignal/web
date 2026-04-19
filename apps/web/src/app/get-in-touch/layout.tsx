import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get In Touch",
  description:
    "Ready to build a partnership with soul? Tell us about your show, your brand, or what you're making — and we'll find the frequency that fits.",
};

export default function GetInTouchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
