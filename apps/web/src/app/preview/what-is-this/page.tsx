"use client";

import { useEffect, useRef } from "react";

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
  const filmRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const film = filmRef.current;
    if (!film) return;
    film.muted = true;
    void film.play().catch(() => {});
  }, []);

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
        <div className={preview.film}>
          <video
            ref={filmRef}
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
        </div>
        <div className={preview.rays} aria-hidden="true">
          {[
            { side: preview.rayLeft, angle: "8deg", thick: "34vw", strength: 0.32, delay: "0s", peak: 0.7 },
            { side: preview.rayLeft, angle: "24deg", thick: "46vw", strength: 0.5, delay: "2.4s", peak: 0.85 },
            { side: preview.rayLeft, angle: "40deg", thick: "22vw", strength: 0.22, delay: "4.2s", peak: 0.6 },
            { side: preview.rayRight, angle: "-6deg", thick: "16vw", strength: 0.28, delay: "0.5s", peak: 0.55 },
            { side: preview.rayRight, angle: "-18deg", thick: "11vw", strength: 0.18, delay: "1.7s", peak: 0.45 },
            { side: preview.rayRight, angle: "-33deg", thick: "20vw", strength: 0.34, delay: "3.3s", peak: 0.6 },
            { side: preview.rayRight, angle: "-48deg", thick: "8vw", strength: 0.14, delay: "4.8s", peak: 0.4 },
            { side: preview.rayRight, angle: "-26deg", thick: "14vw", strength: 0.22, delay: "2.8s", peak: 0.5 },
          ].map((ray) => (
            <span
              key={`${ray.side}-${ray.angle}`}
              className={`${preview.ray} ${ray.side}`}
              style={{
                ["--angle" as string]: ray.angle,
                ["--thick" as string]: ray.thick,
                ["--strength" as string]: String(ray.strength),
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
