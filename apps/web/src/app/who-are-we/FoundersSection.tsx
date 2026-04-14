"use client";

import { useState } from "react";
import Image from "next/image";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import styles from "./page.module.css";

const founders = [
  {
    name: "Mike Sense",
    role: "Vision & Partnerships",
    location: "Prague, Czechia",
    linkedin: "https://www.linkedin.com/in/mike-sense/",
    bio: "Mike is good at understanding two important questions: What is a person? And what is shaping the future? He has an appetite for risk-taking adventures, which has resulted in starting two companies that solve real problems that real people encounter in the real world. For him, GHOSTSignal is not just a fun company with friends, but a mission fuelled by curiosity and conviction. Mike resides in Prague, Czech Republic with his family.",
    image: "/images/who-are-we/mike6.jpg",
    signature: "/images/brand/GS-EmailSignatures-mikew.gif",
  },
  {
    name: "Jack W Harding",
    role: "Cultural & Business Strategist",
    location: "Cambridge, UK",
    linkedin: "https://www.linkedin.com/in/jackwharding",
    bio: "Jack is animated by the belief that the world changes when good creators and good brands find each other. With a background in business strategy, research, and podcasting, he loves to help meaningful ideas reach their audience. In co-founding GHOSTSignal, Jack's aim is to amplify good signals that cut through static that dulls culture. He also serves with a Christian cultural apologetics ministry based in the United States.",
    image: "/images/who-are-we/jack11.jpg",
    signature: "/images/brand/GS-EmailSignatures-jackw.gif",
  },
  {
    name: "Martin Drexler",
    role: "Design",
    location: "Munich, Germany",
    linkedin: "https://www.linkedin.com/in/whoismartindrexler/",
    bio: "Martin is an award-winning German designer known for blending creativity, strategy, and measurable impact. With more than 25 international honors—including the German Brand Award in Gold and D&AD Gold—he has led branding and digital experience projects across Europe and the U.S. His craft is rooted in storytelling, user-centered design, and analytical clarity. As a co-founder of GHOSTSignal, Martin brings his passion for shaping meaningful experiences to a new frontier of creator–brand partnership.",
    image: "/images/who-are-we/martin3.jpg",
    signature: "/images/brand/GS-EmailSignatures-martinw.gif",
  },
  {
    name: "Jeremy Reeves",
    role: "Creative Strategist",
    location: "Colorado Springs, CO",
    linkedin: "https://www.linkedin.com/in/jeremy-reeves-5365b036a/",
    bio: "Jeremy is driven by the moment a person sees something new—an insight, a possibility, a truer version of themselves—and by helping them reach it. He has guided individuals through coaching, shaped brand culture and identity for companies, and supported institutions navigating major change. His motivation in co-founding GHOSTSignal is to help build a future where good creators and good companies meet in alignment and make the kind of world we all want.",
    image: "/images/who-are-we/jeremy4.jpg",
    signature: "/images/brand/GS-EmailSignatures-jeremyw.gif",
  },
] as const;

type Founder = (typeof founders)[number];

export function FoundersSection() {
  const [selectedFounder, setSelectedFounder] = useState<Founder | null>(null);

  const openModal = (founder: Founder) => {
    setSelectedFounder(founder);
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    setSelectedFounder(null);
    document.body.style.overflow = "";
  };

  return (
    <section className={styles.teamSection}>
      <div className={styles.teamContainer}>
        {/* Animated floating clouds - background layer */}
        <div className={styles.cloudWrapper}>
          <Image
            src="/images/who-are-we/cloud.png"
            alt=""
            width={600}
            height={400}
            className={`${styles.floatingCloud} ${styles.cloud1}`}
            aria-hidden="true"
          />
          <Image
            src="/images/who-are-we/cloud.png"
            alt=""
            width={600}
            height={400}
            className={`${styles.floatingCloud} ${styles.cloud2}`}
            aria-hidden="true"
          />
          <Image
            src="/images/who-are-we/cloud.png"
            alt=""
            width={600}
            height={400}
            className={`${styles.floatingCloud} ${styles.cloud3}`}
            aria-hidden="true"
          />
        </div>

        {/* Foreground clouds that overlap founders */}
        <div className={styles.cloudWrapperFront}>
          <Image
            src="/images/who-are-we/cloud.png"
            alt=""
            width={600}
            height={400}
            className={`${styles.floatingCloud} ${styles.cloud4}`}
            aria-hidden="true"
          />
          <Image
            src="/images/who-are-we/cloud.png"
            alt=""
            width={600}
            height={400}
            className={`${styles.floatingCloud} ${styles.cloud5}`}
            aria-hidden="true"
          />
        </div>
        <div className={styles.foundersGrid}>
          {founders.map((founder, index) => (
            <ScrollFadeUp key={founder.name} index={index} duration={1.8}>
              <article
                className={styles.founderCard}
                onClick={() => openModal(founder)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openModal(founder);
                  }
                }}
              >
                <Image
                  src={founder.image}
                  alt={`${founder.name} - Co-Founder, ${founder.role}, ${founder.location}`}
                  width={400}
                  height={400}
                  className={styles.founderCardImage}
                />
                <div className={styles.founderHoverOverlay}>
                  <span className={styles.founderName}>{founder.name}</span>
                  <span className={styles.founderRole}>{founder.role}</span>
                </div>
              </article>
            </ScrollFadeUp>
          ))}
        </div>
      </div>

      {/* Modal */}
      {selectedFounder && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.modalClose}
              onClick={closeModal}
              aria-label="Close modal"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className={styles.modalBody}>
              <div className={styles.modalHeader}>
                <Image
                  src={selectedFounder.image}
                  alt={selectedFounder.name}
                  width={80}
                  height={100}
                  className={styles.modalAvatar}
                />
                <div className={styles.modalInfo}>
                  <h3 className={styles.modalName}>{selectedFounder.name}</h3>
                  <p className={styles.modalRole}>{selectedFounder.role}</p>
                  <p className={styles.modalLocation}>{selectedFounder.location}</p>
                </div>
              </div>

              <p className={styles.modalBio}>{selectedFounder.bio}</p>

              <a
                href={selectedFounder.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.modalLinkedIn}
              >
                Connect on LinkedIn
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
