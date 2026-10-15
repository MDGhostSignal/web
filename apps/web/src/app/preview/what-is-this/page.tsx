"use client";

import { useEffect } from "react";

import { SiteHeader } from "@/components/SiteHeader";
import { Section } from "@/components/layout";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import { navLinks } from "@/lib/nav";
import { HomeTypingHero } from "../../HomeTypingLoop";
import home from "../../page.module.css";
import WhatIsThisPage from "../../what-is-this/WhatIsThisPage";

import preview from "./preview.module.css";

/**
 * New homepage. The hero is the girl-in-the-clouds film, then the
 * What Is This story. `/what-is-this` redirects here.
 */
export default function HomepageTestNotLivePage() {
  useEffect(() => {
    const htmlEl = document.documentElement;
    const prev = {
      htmlBg: htmlEl.style.backgroundColor,
      bodyBg: document.body.style.backgroundColor,
      gutter: htmlEl.style.scrollbarGutter,
    };
    htmlEl.style.backgroundColor = "#6ec4e0";
    htmlEl.style.scrollbarGutter = "auto";
    document.body.style.backgroundColor = "#6ec4e0";
    return () => {
      htmlEl.style.backgroundColor = prev.htmlBg;
      htmlEl.style.scrollbarGutter = prev.gutter;
      document.body.style.backgroundColor = prev.bodyBg;
    };
  }, []);

  return (
    <main className={preview.page}>
      <SiteHeader links={navLinks} animateIn />
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
          <source src="/images/home/desktop.webm" type="video/webm" />
          <source src="/images/home/desktop-optimized.mp4" type="video/mp4" />
        </video>
        <div className={preview.rays} aria-hidden="true">
          {[
            { side: preview.rayLeft, width: 14, angle: 16, delay: "0s", peak: 0.82 },
            { side: preview.rayLeft, width: 36, angle: 28, delay: "1.5s", peak: 1 },
            { side: preview.rayLeft, width: 8, angle: 40, delay: "3.2s", peak: 0.7 },
            { side: preview.rayLeft, width: 52, angle: 52, delay: "0.6s", peak: 1 },
            { side: preview.rayLeft, width: 20, angle: 66, delay: "4.4s", peak: 0.88 },
            { side: preview.rayRight, width: 12, angle: -14, delay: "2.1s", peak: 0.78 },
            { side: preview.rayRight, width: 44, angle: -30, delay: "0.3s", peak: 1 },
            { side: preview.rayRight, width: 18, angle: -44, delay: "3.6s", peak: 0.9 },
            { side: preview.rayRight, width: 7, angle: -22, delay: "5.1s", peak: 0.66 },
            { side: preview.rayRight, width: 30, angle: -58, delay: "1.1s", peak: 1 },
          ].map((ray) => (
            <span
              key={`${ray.side}-${ray.angle}`}
              className={`${preview.ray} ${ray.side}`}
              style={{
                width: ray.width,
                transform: `rotate(${ray.angle}deg)`,
                animationDelay: ray.delay,
                ["--peak" as string]: String(ray.peak),
              }}
            />
          ))}
        </div>
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
            <p className={preview.scrollCue}>
              <span>Scroll</span>
              <img src="/images/home/icon-arrow-down.svg" alt="" />
            </p>
          </ScrollFadeUp>
        </Section>
        <Section className={preview.transition} aria-hidden="true" />
      </div>
      <div id="what-is-this" className={preview.mid}>
        <WhatIsThisPage showHeader={false} showHero={false} previewPlates />
      </div>
    </main>
  );
}
