import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "X-Deck · GhostSignal",
  description:
    "Trading-card-style preview of XQ-matched creators and brands. Internal review surface.",
};

export default function XDeckLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
