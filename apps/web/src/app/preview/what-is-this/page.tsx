"use client";

import Link from "next/link";
import { useEffect } from "react";

import { SiteHeader } from "@/components/SiteHeader";
import { Section } from "@/components/layout";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import { previewNavLinks } from "../nav";
import { HomeTypingHero } from "../../HomeTypingLoop";
import home from "../../page.module.css";
import WhatIsThisPage from "../../what-is-this/page";

import preview from "./preview.module.css";

/**
 * Preview of the new What Is This page. Live / and /what-is-this stay unchanged.
 */
export default function HomepageTestNotLivePage() {
  useEffect(() => {
    const htmlEl = document.documentElement;
    const prev = {
      htmlBg: htmlEl.style.backgroundColor,
      bodyBg: document.body.style.backgroundColor,
      gutter: htmlEl.style.scrollbarGutter,
    };
    htmlEl.style.backgroundColor = "#000";
    htmlEl.style.scrollbarGutter = "auto";
    document.body.style.backgroundColor = "#000";
    return () => {
      htmlEl.style.backgroundColor = prev.htmlBg;
      htmlEl.style.scrollbarGutter = prev.gutter;
      document.body.style.backgroundColor = prev.bodyBg;
    };
  }, []);

  return (
    <main className={preview.page}>
      <SiteHeader links={previewNavLinks} animateIn />
      <div className={preview.homeHero}>
        <video
          className={preview.video}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        >
          <source src="/images/preview/lady-earbuds-blink-locked.mp4" type="video/mp4" />
        </video>
        <Section className={`${home.heroSection} ${preview.heroCopy}`}>
          <h1 className={home.heroHeadline}>
            <HomeTypingHero layout="split" />
          </h1>
          <ScrollFadeUp index={0} duration={1.4} delay={3.0} start="top 90%">
            <p className={home.heroSubtitle}>
              Soulful partnerships for creators and advertisers who care
            </p>
          </ScrollFadeUp>
          <ScrollFadeUp index={1} duration={1.4} delay={3.0} start="top 90%">
            <Link href="#what-is-this" className={home.ctaButton}>
              Learn more
            </Link>
          </ScrollFadeUp>
        </Section>
        <Section className={preview.transition} aria-hidden="true" />
      </div>
      <div id="what-is-this">
        <WhatIsThisPage showHeader={false} showHero={false} />
      </div>
    </main>
  );
}
