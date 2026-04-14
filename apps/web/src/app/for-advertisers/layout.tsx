import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "For Advertisers | GhostSignal",
  description: "The right audience changes everything. We help you reach aligned audiences by pairing your brand with creators who share your convictions.",
};

export default function ForAdvertisersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
