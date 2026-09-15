"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { BrandedGhostSignal } from "@/components/BrandedGhostSignal";

import styles from "./page.module.css";

const SLIDES = [
  {
    src: "/images/proposals/holly-mackle/slide-01.png",
    label: "Cover",
    title: "Brand Proposal",
  },
  {
    src: "/images/proposals/holly-mackle/slide-02.png",
    label: "Opportunity",
    title: "The opportunity",
  },
  {
    src: "/images/proposals/holly-mackle/slide-03.png",
    label: "The Work",
    title: "Four connected steps",
  },
  {
    src: "/images/proposals/holly-mackle/slide-04.png",
    label: "Timeline",
    title: "About two weeks",
  },
  {
    src: "/images/proposals/holly-mackle/slide-05.png",
    label: "Scope",
    title: "Scope of work + investment",
  },
  {
    src: "/images/proposals/holly-mackle/slide-06.png",
    label: "Next Steps",
    title: "Ready when you are",
  },
] as const;

export default function HollyMackleProposalPage() {
  const [active, setActive] = useState(0);
  const stageRef = useRef<HTMLElement | null>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);

  const scrollToSlide = useCallback((index: number) => {
    const el = slideRefs.current[index];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    setActive(index);
  }, []);

  useEffect(() => {
    const root = stageRef.current;
    if (!root) return;
    const nodes = slideRefs.current.filter(Boolean) as HTMLElement[];
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const idx = nodes.indexOf(visible.target as HTMLElement);
        if (idx >= 0) setActive(idx);
      },
      { root, threshold: 0.55 }
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === "j" || e.key === " ") {
        e.preventDefault();
        scrollToSlide(Math.min(active + 1, SLIDES.length - 1));
      }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "k") {
        e.preventDefault();
        scrollToSlide(Math.max(active - 1, 0));
      }
      if (e.key === "Home") {
        e.preventDefault();
        scrollToSlide(0);
      }
      if (e.key === "End") {
        e.preventDefault();
        scrollToSlide(SLIDES.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, scrollToSlide]);

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <Image
            src="/images/brand/cloudmark-white.png"
            alt=""
            width={36}
            height={36}
            className={styles.cloud}
            priority
          />
          <BrandedGhostSignal variant="light" className={styles.wordmark} />
        </div>
        <p className={styles.topTitle}>Holly Mackle Proposal V1</p>
        <span className={styles.counter} aria-live="polite">
          {String(active + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
        </span>
      </header>

      <aside className={styles.rail} aria-label="Slide navigation">
        <p className={styles.railLabel}>Slides</p>
        <ol className={styles.railList}>
          {SLIDES.map((slide, i) => (
            <li key={slide.src}>
              <button
                type="button"
                className={i === active ? styles.railItemActive : styles.railItem}
                onClick={() => scrollToSlide(i)}
                aria-current={i === active ? "true" : undefined}
              >
                <span className={styles.railNum}>{String(i + 1).padStart(2, "0")}</span>
                <span className={styles.railTitle}>{slide.label}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className={styles.railHint}>← → · Space · J / K</p>
      </aside>

      <main
        className={styles.stage}
        ref={stageRef}
        tabIndex={0}
        aria-label="Proposal slides"
      >
        {SLIDES.map((slide, i) => (
          <section
            key={slide.src}
            id={`slide-${i + 1}`}
            className={styles.slideViewport}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            aria-label={`Slide ${i + 1}: ${slide.title}`}
          >
            <div className={styles.slideCanvas}>
              <Image
                src={slide.src}
                alt={`Slide ${i + 1}: ${slide.title}`}
                width={1920}
                height={1080}
                className={styles.slideImage}
                priority={i < 2}
                sizes="100vw"
              />
            </div>
          </section>
        ))}
      </main>

      <nav className={styles.mobileNav} aria-label="Slide controls">
        <button
          type="button"
          className={styles.mobileBtn}
          onClick={() => scrollToSlide(Math.max(active - 1, 0))}
          disabled={active === 0}
        >
          Prev
        </button>
        <span className={styles.mobileCounter}>
          {active + 1} / {SLIDES.length}
        </span>
        <button
          type="button"
          className={styles.mobileBtn}
          onClick={() => scrollToSlide(Math.min(active + 1, SLIDES.length - 1))}
          disabled={active === SLIDES.length - 1}
        >
          Next
        </button>
      </nav>
    </div>
  );
}
