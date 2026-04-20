import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Signal Sheet",
  description:
    "A working glossary of the terms that shape GhostSignal — the philosophical anchors, technical grammar, and advertising vocabulary that make the signal coherent.",
};

export default function SignalSheetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
