"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

import { ScrollTriggerOrchestrator } from "@/motion/ScrollTriggerOrchestrator";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
    >
      <ScrollTriggerOrchestrator />
      {children}
    </MotionConfig>
  );
}

