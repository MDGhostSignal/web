"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef } from "react";

import { gsap, ScrollTrigger } from "@/motion/gsap";
import { useIsomorphicLayoutEffect } from "@/motion/useIsomorphicLayoutEffect";
import { useGsapContext } from "@/motion/useGsapContext";

type NavLink = { href: string; label: string };

const linkFrameWidths: Record<string, number> = {
  "/what-is-this": 169,
  "/for-creators": 174,
  "/for-advertisers": 200,
  "/who-are-we": 173,
  "/get-in-touch": 175,
  "/snowdrift": 174,
};

/**
 * Mirrors `wearemotto.com`'s site header collapse behavior:
 * - When scrollY > 100: links animate out (yPercent:-100, alpha:0, stagger:-.035),
 *   CTA slides out (xPercent:-100), toggle fades in (autoAlpha:1 at 0.25).
 * - When scrollY <= 100: toggle fades out, CTA slides in, links animate in (expo stagger).
 *
 * Styling stays token-driven; motion values are taken from Motto's shipped code.
 */
export function SiteHeader({
  links,
  cta,
}: {
  links: readonly NavLink[];
  cta?: { href: string; label: string };
}) {
  const { rootRef, contextRef } = useGsapContext<HTMLDivElement>();

  const linksWrapRef = useRef<HTMLDivElement | null>(null);
  const ctaRef = useRef<HTMLAnchorElement | null>(null);

  const px = "var(--gs-px)";
  const n = useMemo(() => (value: number) => `calc(var(--gs-n-${value}) * ${px})`, [px]);
  const fontSize = useMemo(
    () => (token: string) => `calc(var(--gs-font-size-${token}) * ${px})`,
    [px],
  );

  // Note: we keep these as literal values because they are taken from Motto's code.
  const THRESHOLD_Y = 100;

  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const activeRef = useRef(false);

  useIsomorphicLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const linksWrap = linksWrapRef.current;
    const ctaEl = ctaRef.current;
    if (!linksWrap) return;

    const linkEls = Array.from(linksWrap.querySelectorAll<HTMLElement>("[data-sh-link]"));
    const keepLinkEl =
      linksWrap.querySelector<HTMLElement>('[data-sh-link][data-sh-key="/get-in-touch"]') ??
      linksWrap.querySelector<HTMLElement>('[data-sh-link][data-sh-key="/get-in-touch/"]') ??
      null;
    const hideLinkEls = keepLinkEl ? linkEls.filter((el) => el !== keepLinkEl) : linkEls;
    const mq = window.matchMedia("(max-width: 991px)");

    // All GSAP instances created in this callback will be reverted by useGsapContext.
    contextRef.current?.add(() => {
      tlRef.current = gsap.timeline({
        paused: true,
        defaults: { duration: 0.75, ease: "snappy" },
      });

      // Initial state: links visible, CTA in place.
      if (ctaEl) gsap.set(ctaEl, { xPercent: 0 });
      gsap.set(linkEls, { yPercent: 0, alpha: 1 });
      if (hideLinkEls.length) gsap.set(hideLinkEls, { display: "inline-flex" });
    });

    const runOut = () => {
      document.body.classList.add("is-head-active");
      tlRef.current
        ?.clear()
        .to(hideLinkEls, { yPercent: -100, alpha: 0, stagger: -0.035 }, 0)
        .to(ctaEl ?? {}, { xPercent: -100 }, 0)
        .set(hideLinkEls, { display: "none" }, 0.75)
        .restart();
    };

    const runIn = () => {
      document.body.classList.remove("is-head-active");
      tlRef.current
        ?.clear()
        .set(hideLinkEls, { display: "inline-flex" }, 0)
        .to(ctaEl ?? {}, { xPercent: 0, duration: 1 }, 0)
        .to(hideLinkEls, { yPercent: 0, alpha: 1, duration: 1, stagger: 0.035, ease: "expo" }, 0)
        .restart();
    };

    const onScroll = () => {
      if (mq.matches) return;
      const y = window.scrollY || 0;
      if (y > THRESHOLD_Y && !activeRef.current) {
        activeRef.current = true;
        runOut();
      } else if (y <= THRESHOLD_Y && activeRef.current) {
        activeRef.current = false;
        runIn();
      }
    };

    const syncForViewport = () => {
      // When switching to mobile, reset the "active" body class.
      if (mq.matches) {
        document.body.classList.remove("is-head-active");
        activeRef.current = false;
        tlRef.current?.pause(0);
        if (ctaEl) gsap.set(ctaEl, { xPercent: 0 });
        gsap.set(linkEls, { yPercent: 0, alpha: 1 });
        if (hideLinkEls.length) gsap.set(hideLinkEls, { display: "inline-flex" });
      } else {
        // Desktop: force a re-evaluation based on scroll position.
        onScroll();
      }
    };

    // Optional Motto pattern: sections can hide the header via `.js-s-hide-sh`.
    const hideTriggerEl = document.querySelector<HTMLElement>(".js-s-hide-sh");
    const hideSt = hideTriggerEl
      ? ScrollTrigger.create({
          trigger: hideTriggerEl,
          start: "top center",
          onToggle: (self) => {
            const el = rootRef.current;
            if (!el) return;
            if (self.isActive) gsap.to(el, { yPercent: -100, duration: 0.75, ease: "snappy" });
            else gsap.to(el, { yPercent: 0, duration: 0.75, ease: "snappy" });
          },
        })
      : null;

    const onMqChange = () => syncForViewport();
    mq.addEventListener?.("change", onMqChange);

    window.addEventListener("scroll", onScroll, { passive: true });
    syncForViewport();

    return () => {
      window.removeEventListener("scroll", onScroll);
      mq.removeEventListener?.("change", onMqChange);
      hideSt?.kill();
      tlRef.current?.kill();
      tlRef.current = null;
    };
  }, [THRESHOLD_Y, contextRef, rootRef]);

  return (
    <div ref={rootRef} style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50 }}>
      <header
        className="js-sh"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          height: "140px",
          minHeight: "140px",
          paddingLeft: n(48),
          paddingRight: n(48),
          background: "#f2f2f2",
        }}
      >
        <div
          className="js-sh-logo-wrap"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: n(185),
            height: n(80),
            paddingTop: n(16),
            paddingBottom: n(16),
            paddingLeft: n(64),
            paddingRight: n(64),
            overflow: "hidden",
          }}
        >
          <Image
            src="/images/home/figma/logo-black-1.svg"
            alt="Ghost Signal"
            width={57}
            height={48}
            priority
            style={{ display: "block", width: n(57), height: n(48) }}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            columnGap: n(24),
          }}
        >
          <nav
            aria-label="Primary"
            ref={linksWrapRef}
            className="js-sh-main-links"
            style={{
              display: "flex",
              alignItems: "center",
              width: n(1385),
              height: n(60),
              justifyContent: "flex-start",
              columnGap: n(64),
            }}
          >
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="js-sh-main-link"
                data-sh-link
                data-sh-key={l.href}
                data-sh-role={l.href === "/get-in-touch" ? "keep" : "hide"}
                style={{
                  display: "inline-flex",
                  justifyContent: "center",
                  alignItems: "center",
                  width: n(linkFrameWidths[l.href] ?? 174),
                  height: n(60),
                  gap: n(8),
                  paddingTop: n(16),
                  paddingBottom: n(16),
                  paddingLeft: n(32),
                  paddingRight: n(32),
                  fontFamily: "var(--font-body)",
                  fontWeight: "var(--gs-font-weight-bold)",
                  fontSize: fontSize("lg"),
                  lineHeight: "1.5555555555555556em",
                  color: "var(--gs-tw-black)",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {cta ? (
            <Link
              ref={ctaRef}
              href={cta.href}
              className="js-sh-cta"
              style={{
                display: "inline-flex",
                justifyContent: "center",
                alignItems: "center",
                height: n(36),
                paddingTop: n(8),
                paddingBottom: n(8),
                paddingLeft: n(16),
                paddingRight: n(16),
                borderRadius: `calc(var(--gs-radius-lg) * ${px})`,
                border: `calc(var(--gs-border-width) * ${px}) solid var(--gs-border)`,
                background: "var(--gs-background)",
                boxShadow: "0px 1px 2px 0px rgb(0 0 0 / 0.1)",
                color: "var(--gs-foreground)",
                textDecoration: "none",
                fontFamily: "var(--font-body)",
                fontWeight: "var(--gs-font-weight-medium)",
                fontSize: fontSize("sm"),
                lineHeight: "1.4285714285714286em",
                whiteSpace: "nowrap",
              }}
            >
              {cta.label}
            </Link>
          ) : null}

        </div>
      </header>
    </div>
  );
}
