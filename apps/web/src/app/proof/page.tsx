import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
import { Container, Section } from "@/components/layout";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";
import { navLinks } from "@/lib/nav";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Proof",
  description:
    "Seven placements across podcast, Instagram, and newsletter. Every one produced a measurable, positive result for the brand involved.",
};

type Channel = "Podcast" | "Instagram" | "Newsletter";

const PLACEMENTS: Array<{
  brand: string;
  channels: Channel[];
  room: string;
  result: ReactNode;
}> = [
  {
    brand: "MatchGrant",
    channels: ["Podcast"],
    room: "The Biblical Mind",
    result: (
      <>
        <span className={styles.hi}>7x</span> return on conversions
      </>
    ),
  },
  {
    brand: "MatchGrant",
    channels: ["Podcast"],
    room: "The Pivot",
    result: (
      <>
        <span className={styles.hi}>3x</span> return on conversions
      </>
    ),
  },
  {
    brand: "Etkin Designs",
    channels: ["Podcast"],
    room: "The Habit",
    result: (
      <>
        <span className={styles.hi}>80%</span> lift in website traffic
      </>
    ),
  },
  {
    brand: "Global Counseling Network",
    channels: ["Podcast"],
    room: "The Habit",
    result: (
      <>
        <span className={styles.hi}>50%</span> traffic lift; <span className={styles.hi}>1.5x</span>{" "}
        return
      </>
    ),
  },
  {
    brand: "Tektones",
    channels: ["Podcast"],
    room: "Unseriously with Holly Mackle",
    result: (
      <>
        <span className={styles.hi}>1.5x</span> return
      </>
    ),
  },
  {
    brand: "Tektones",
    channels: ["Instagram", "Newsletter"],
    room: "Sunshine In My Nest",
    result: (
      <>
        Positive results
        <span className={styles.soft}>Conversions still coming in</span>
      </>
    ),
  },
  {
    brand: "Tektones",
    channels: ["Instagram", "Newsletter"],
    room: "Life Giving Pages",
    result: "Very positive results",
  },
];

function ChannelChip({ channel }: { channel: Channel }) {
  const tone =
    channel === "Podcast" ? styles.pod : channel === "Instagram" ? styles.ig : styles.nl;
  return <span className={`${styles.chip} ${tone}`}>{channel}</span>;
}

export default function ProofPage() {
  return (
    <main className={styles.page}>
      <SiteHeader links={navLinks} />

      <Section className={styles.hero}>
        <Container className={styles.heroInner}>
          <div className={styles.morse} aria-hidden="true" />
          <ScrollFadeUp index={0} duration={1.4}>
            <p className={styles.eyebrow}>Values-aligned rooms</p>
          </ScrollFadeUp>
          <h1 className={styles.headline}>
            <SplitLinesReveal duration={1.6} stagger={0.18}>
              <span className={styles.headlineLine}>When the room is right,</span>
            </SplitLinesReveal>
            <SplitLinesReveal duration={1.6} stagger={0.18} delay={0.2}>
              <span className={styles.headlineLine}>the message is welcome.</span>
            </SplitLinesReveal>
          </h1>
          <ScrollFadeUp index={1} duration={1.5}>
            <p className={styles.lead}>
              Seven placements across podcast, Instagram, and newsletter. Every one produced
              a measurable, positive result for the brand involved.
            </p>
          </ScrollFadeUp>
        </Container>
      </Section>

      <Section className={styles.band}>
        <Container>
          <ul className={styles.stats}>
            <li>
              <ScrollFadeUp index={0} duration={1.3}>
                <div className={`${styles.morse} ${styles.morseShort}`} aria-hidden="true" />
                <p className={styles.statNum}>7x</p>
                <p className={styles.statLabel}>Return on conversions</p>
                <p className={styles.statSub}>
                  The strongest single placement, on The Biblical Mind podcast.
                </p>
              </ScrollFadeUp>
            </li>
            <li>
              <ScrollFadeUp index={1} duration={1.3}>
                <div className={`${styles.morse} ${styles.morseShort}`} aria-hidden="true" />
                <p className={styles.statNum}>
                  <small>up to</small>80%
                </p>
                <p className={styles.statLabel}>Lift in website traffic</p>
                <p className={styles.statSub}>
                  Tracked podcast campaigns saw traffic lifts of 50% to 80%.
                </p>
              </ScrollFadeUp>
            </li>
            <li>
              <ScrollFadeUp index={2} duration={1.3}>
                <div className={`${styles.morse} ${styles.morseShort}`} aria-hidden="true" />
                <p className={styles.statNum}>
                  7 <small className={styles.statOf}>of</small> 7
                </p>
                <p className={styles.statLabel}>Measurably positive placements</p>
                <p className={styles.statSub}>Across three channels and six rooms.</p>
              </ScrollFadeUp>
            </li>
          </ul>
        </Container>
      </Section>

      <Section className={styles.bandTight}>
        <Container>
          <div className={styles.secHead}>
            <p className={styles.sectionEyebrow}>Results by placement</p>
            <ul className={styles.legend} aria-label="Channels">
              <li>
                <ChannelChip channel="Podcast" />
              </li>
              <li>
                <ChannelChip channel="Instagram" />
              </li>
              <li>
                <ChannelChip channel="Newsletter" />
              </li>
            </ul>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className={styles.srOnly}>Campaign results by brand, channel, and room</caption>
              <thead>
                <tr>
                  <th scope="col">Brand</th>
                  <th scope="col">Channel</th>
                  <th scope="col">Room</th>
                  <th scope="col">Result</th>
                </tr>
              </thead>
              <tbody>
                {PLACEMENTS.map((row) => (
                  <tr key={`${row.brand}-${row.room}-${row.channels.join("-")}`}>
                    <td data-label="Brand">{row.brand}</td>
                    <td data-label="Channel">
                      <span className={styles.chans}>
                        {row.channels.map((channel) => (
                          <ChannelChip key={channel} channel={channel} />
                        ))}
                      </span>
                    </td>
                    <td data-label="Room">{row.room}</td>
                    <td data-label="Result" className={styles.result}>
                      {row.result}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.cards}>
            <ScrollFadeUp index={0} duration={1.3}>
              <article className={styles.card}>
                <div className={`${styles.morse} ${styles.morseShort}`} aria-hidden="true" />
                <h2>What this shows</h2>
                <p>
                  Trust does the work when a brand fits the room. Every placement produced a
                  positive, measurable outcome, from a 7x return on conversions to traffic lifts
                  of 50% to 80% on tracked podcast campaigns.
                </p>
              </article>
            </ScrollFadeUp>
            <ScrollFadeUp index={1} duration={1.3}>
              <article className={`${styles.card} ${styles.cardNext}`}>
                <div className={`${styles.morse} ${styles.morseShort}`} aria-hidden="true" />
                <h2>A next step</h2>
                <p>
                  If your brand is considering similar rooms, we are glad to share more detail on
                  any of these campaigns, or talk through current availability.
                </p>
                <a className={styles.mail} href="mailto:mike@ghostsignal.cloud">
                  Write to Mike
                </a>
              </article>
            </ScrollFadeUp>
          </div>

          <p className={styles.disc}>
            These were individual placements in values-aligned rooms. Results are specific to the
            brands and channels involved and are not presented as guarantees. Where a result is
            described rather than measured, it reflects the brand&apos;s own read. One campaign was
            still converting at the time of writing.
          </p>
        </Container>
      </Section>

      <Section className={styles.close}>
        <Container className={styles.closeInner}>
          <p className={styles.closeName}>Mike Sense</p>
          <p className={styles.closeRole}>Co-founder, Vision &amp; Partnerships</p>
          <p className={styles.closeLinks}>
            <a href="https://ghostsignal.cloud">ghostsignal.cloud</a>
            <a href="mailto:mike@ghostsignal.cloud">mike@ghostsignal.cloud</a>
          </p>
        </Container>
      </Section>

      <Footer />
    </main>
  );
}
