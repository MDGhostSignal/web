"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { gsap, ScrollTrigger } from "@/motion/gsap";
import { useIsomorphicLayoutEffect } from "@/motion/useIsomorphicLayoutEffect";
import { useGsapContext } from "@/motion/useGsapContext";

import styles from "./SiteHeader.module.css";

type NavLink = { href: string; label: string; cta?: boolean };

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
  animateIn = false,
  animateInDelay = 0,
}: {
  links: readonly NavLink[];
  cta?: { href: string; label: string };
  /** If true, links animate in on mount (like the scroll-up reveal) */
  animateIn?: boolean;
  /** Delay in seconds before the animate-in starts */
  animateInDelay?: number;
}) {
  const { rootRef, contextRef } = useGsapContext<HTMLDivElement>();

  const logoRef = useRef<HTMLAnchorElement | null>(null);
  const linksWrapRef = useRef<HTMLDivElement | null>(null);
  const ctaRef = useRef<HTMLAnchorElement | null>(null);

  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // Close the overlay whenever the route changes. Render-phase
  // compare-and-set (React-recommended "reset state on derived change"
  // pattern) avoids the cascading-render lint rule on a useEffect.
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    if (mobileOpen) setMobileOpen(false);
  }

  // Lock body scroll while the overlay is open; restore on close/unmount.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  // Note: we keep these as literal values because they are taken from Motto's code.
  const THRESHOLD_Y = 100;

  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const activeRef = useRef(false);

  useIsomorphicLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const logoEl = logoRef.current;
    const linksWrap = linksWrapRef.current;
    const ctaEl = ctaRef.current;
    if (!linksWrap) return;

    // Defensive reset: the `.js-s-hide-sh` ScrollTrigger on previous pages
    // spawns yPercent tweens on this element that live OUTSIDE the gsap
    // context, so they don't get reverted on unmount. Kill any stragglers,
    // force the bar back to yPercent=0, and clear the body class before any
    // further setup, so the bar always boots flush against the bottom of
    // the viewport.
    const rootEl = rootRef.current;
    if (rootEl) {
      gsap.killTweensOf(rootEl);
      gsap.set(rootEl, { clearProps: "transform", yPercent: 0 });
    }
    activeRef.current = false;
    document.body.classList.remove("is-head-active");

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

      // Initial state: header visible
      const el = rootRef.current;
      if (el) gsap.set(el, { yPercent: 0 });
      if (ctaEl) gsap.set(ctaEl, { xPercent: 0 });

      // Start logo and links hidden, then animate in
      gsap.set(logoEl, { yPercent: -100, alpha: 0 });
      gsap.set(linkEls, { yPercent: -100, alpha: 0 });
      if (hideLinkEls.length) gsap.set(hideLinkEls, { display: "inline-flex" });

      // Animate logo in first, then links with stagger
      gsap.to(logoEl, {
        yPercent: 0,
        alpha: 1,
        duration: 1,
        ease: "expo",
        delay: animateInDelay,
      });
      gsap.to(linkEls, {
        yPercent: 0,
        alpha: 1,
        duration: 1,
        stagger: 0.035,
        ease: "expo",
        delay: animateInDelay + 0.05,
      });
    });

    const runOut = () => {
      document.body.classList.add("is-head-active");
      tlRef.current
        ?.clear()
        .to(logoEl ?? {}, { yPercent: -100, alpha: 0 }, 0)
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
        .to(logoEl ?? {}, { yPercent: 0, alpha: 1, duration: 1, ease: "expo" }, 0)
        .to(ctaEl ?? {}, { xPercent: 0, duration: 1 }, 0)
        .to(hideLinkEls, { yPercent: 0, alpha: 1, duration: 1, stagger: 0.035, ease: "expo" }, 0.05)
        .restart();
    };

    // Direction-based visibility: past THRESHOLD_Y the header follows
    // scroll direction — scrolling down hides it, scrolling up brings
    // it back. Near the top (<= THRESHOLD_Y) the header is always
    // visible regardless of direction. DIR_THRESHOLD filters momentum
    // noise and trackpad micro-jitter so the bar doesn't flicker.
    const DIR_THRESHOLD = 10;
    let lastY = window.scrollY || 0;

    const onScroll = () => {
      if (mq.matches) return;
      const y = window.scrollY || 0;
      const delta = y - lastY;
      lastY = y;

      if (y <= THRESHOLD_Y) {
        if (activeRef.current) {
          activeRef.current = false;
          runIn();
        }
        return;
      }

      if (Math.abs(delta) < DIR_THRESHOLD) return;

      if (delta > 0 && !activeRef.current) {
        activeRef.current = true;
        runOut();
      } else if (delta < 0 && activeRef.current) {
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
        if (logoEl) gsap.set(logoEl, { yPercent: 0, alpha: 1 });
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
      if (rootEl) gsap.killTweensOf(rootEl);
      tlRef.current?.kill();
      tlRef.current = null;
      // The body class is set on `runOut` but only cleared by `runIn`, which
      // fires on a scroll transition. On client-side navigation the next page's
      // fresh SiteHeader starts with activeRef=false, so runIn never fires and
      // the class leaks — CSS rules then hide the logo and nav links on the
      // new page. Clear it here so every page boots with a clean slate.
      document.body.classList.remove("is-head-active");
    };
  }, [THRESHOLD_Y, animateIn, animateInDelay, contextRef, rootRef]);

  return (
    <>
    <div
      ref={rootRef}
      className={`${styles.headerRoot} ${mobileOpen ? styles.headerRootOpen : ""}`}
    >
      <header className={`${styles.header} js-sh`}>
        <Link ref={logoRef} href="/" className={`${styles.logoWrap} js-sh-logo-wrap`}>
          <Image
            src="/images/home/figma/logo-black-1.svg"
            alt="Ghost Signal"
            width={57}
            height={48}
            priority
            className={styles.logo}
          />
        </Link>

        <button
          type="button"
          className={styles.mobileTrigger}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-overlay"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span className={`${styles.mobileTriggerBar} ${mobileOpen ? styles.mobileTriggerBarOpen : ""}`} aria-hidden="true" />
          <span className={`${styles.mobileTriggerBar} ${mobileOpen ? styles.mobileTriggerBarOpen : ""}`} aria-hidden="true" />
          <span className={`${styles.mobileTriggerBar} ${mobileOpen ? styles.mobileTriggerBarOpen : ""}`} aria-hidden="true" />
        </button>

        <div className={styles.navContainer}>
          <nav
            aria-label="Primary"
            ref={linksWrapRef}
            className={`${styles.nav} js-sh-main-links`}
          >
            {links.map((l) => {
              // CTA entries render as a solid pill so the primary
              // action (Get In Touch) reads distinct from the plain
              // nav links. The prior per-link fixed-width track was
              // dropped so seven links + a CTA fit inside the header
              // at common desktop widths — links now size to their
              // own content + padding rather than a pixel-perfect
              // Motto-style cell.
              const isCta = l.cta === true;
              const className = isCta
                ? `${styles.navCta} js-sh-main-link`
                : `${styles.navLink} js-sh-main-link`;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={className}
                  data-sh-link
                  data-sh-key={l.href}
                  data-sh-role={l.href === "/get-in-touch" ? "keep" : "hide"}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          {cta ? (
            <Link
              ref={ctaRef}
              href={cta.href}
              className={`${styles.cta} js-sh-cta`}
            >
              {cta.label}
            </Link>
          ) : null}
        </div>
      </header>

    </div>
    {/* Mobile overlay rendered as a SIBLING of .headerRoot (not nested
        inside it) so iOS Safari doesn't trip on position:fixed inside
        position:fixed — a known historical quirk where the inner fixed
        element gets sized to its content instead of the viewport,
        showing as a small popup in the top portion of the screen
        instead of a full-screen takeover. As a sibling it gets the
        viewport as its containing block cleanly. */}
    <div
      id="mobile-nav-overlay"
      className={`${styles.mobileOverlay} ${mobileOpen ? styles.mobileOverlayOpen : ""}`}
      aria-hidden={!mobileOpen}
    >
      <button
        type="button"
        className={styles.mobileCloseBtn}
        aria-label="Close menu"
        onClick={closeMobile}
        tabIndex={mobileOpen ? 0 : -1}
      >
        <span className={styles.mobileCloseBar} aria-hidden="true" />
        <span className={styles.mobileCloseBar} aria-hidden="true" />
      </button>
      <nav aria-label="Mobile" className={styles.mobileNav}>
        {links.map((l) => {
          const isCta = l.cta === true;
          const className = isCta
            ? styles.mobileNavCta
            : styles.mobileNavLink;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={className}
              onClick={closeMobile}
              tabIndex={mobileOpen ? 0 : -1}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </div>
    </>
  );
}
