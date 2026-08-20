"use client";

import dynamic from "next/dynamic";
import Image from "next/image";

import { RQResultsGraph } from "@/components/rq/RQResultsGraph";
import type { RQResult, SignalClarity } from "@/lib/rq/scoring";

const DesertFog = dynamic(() => import("./DesertFog"), { ssr: false });
const SnowAnimation = dynamic(
  () => import("./SnowAnimation").then((m) => m.SnowAnimation),
  { ssr: false },
);

type AxisKey = "values" | "authenticity" | "horizon";

type AxisConfig = {
  key: AxisKey;
  heading: string;
  /** [positive letter, positive name], [negative letter, negative name] */
  letters: [[string, string], [string, string]];
  /** Article for each letter: "an F", "an I", "a C". */
  articles: [string, string];
  /** One-line description of what this axis captures. */
  description: string;
  /** Personal description for each letter, written in full sentences. */
  personal: [string, string];
  /** Closing reflection shown below the personal description. */
  note: string;
};

const AXES: AxisConfig[] = [
  {
    key: "values",
    heading: "Axis 1: Values Orientation",
    letters: [
      ["F", "Formative"],
      ["I", "Implicit"],
    ],
    articles: ["an F", "an I"],
    description: "This axis reflects how your convictions show up in your work.",
    personal: [
      "your values are named, declared, and actively shaping your message—what you stand for is part of what you say.",
      "your values are lived rather than stated—what you stand for is revealed through tone, choices, and outcomes.",
    ],
    note: "Neither is more \u201ctrue\u201d than the other. This is about where your signal is most naturally expressed: spoken or embodied, explicit or ambient.",
  },
  {
    key: "authenticity",
    heading: "Axis 2: Authenticity Expression",
    letters: [
      ["R", "Relational"],
      ["S", "Structural"],
    ],
    articles: ["an R", "an S"],
    description: "This axis captures how your voice carries trust.",
    personal: [
      "your authenticity flows through story, personality, and lived experience—people trust you because they feel like they know you.",
      "your authenticity comes through clarity, consistency, and well-formed ideas—people trust you because your message holds together.",
    ],
    note: "This is not a choice between warmth and rigor. It\u2019s about whether your signal lands more through connection or construction, presence or precision.",
  },
  {
    key: "horizon",
    heading: "Axis 3: Flourishing Time Horizon",
    letters: [
      ["L", "Long-Arc"],
      ["C", "Catalytic"],
    ],
    articles: ["an L", "a C"],
    description: "This axis reveals how you think about growth, impact, and partnership over time.",
    personal: [
      "you prioritize depth, durability, and relationships that compound slowly—trust is built and protected over time.",
      "you value momentum, activation, and timely impact—energy is directed toward movement and measurable lift.",
    ],
    note: "Both create real value. This axis simply shows whether your signal is oriented toward endurance or ignition, formation or acceleration.",
  },
];

function axisResultModifier(score: number) {
  if (score <= 3) return "rq-axis-result-light";
  if (score <= 6) return "rq-axis-result-balanced";
  return "rq-axis-result-strong";
}

function AxisExplanation({
  axis,
  data,
}: {
  axis: AxisConfig;
  data: RQResult["details"][AxisKey];
}) {
  const [positive, negative] = axis.letters;
  const isPositive = data.letter === positive[0];
  const activeIndex = isPositive ? 0 : 1;
  const [activeLetter, activeName] = axis.letters[activeIndex];
  // axis.articles[i] is a phrase like "an F" or "a C" — split to get the
  // leading article word ("an"/"a") for the personal sentence, while the
  // full phrase is used inside the badge.
  const activeArticlePhrase = axis.articles[activeIndex];
  const articleWord = activeArticlePhrase.split(" ", 1)[0];

  return (
    <div className="rq-axis-explanation">
      <h3 className="rq-axis-name">
        {axis.heading}
        <span className={`rq-axis-result ${axisResultModifier(data.score)}`}>
          You&apos;re {activeArticlePhrase} ({data.score})
        </span>
      </h3>
      <p className="rq-axis-spectrum">
        <span className={isPositive ? "rq-spectrum-active" : "rq-spectrum-inactive"}>
          {positive[1]}
        </span>
        {" \u2190\u2192 "}
        <span className={!isPositive ? "rq-spectrum-active" : "rq-spectrum-inactive"}>
          {negative[1]}
        </span>
      </p>
      <p className="rq-axis-description">{axis.description}</p>
      <p className="rq-axis-personal">
        As {articleWord} <strong>{activeLetter} ({activeName})</strong>, {axis.personal[activeIndex]}
      </p>
      <p className="rq-axis-note">{axis.note}</p>
    </div>
  );
}

type ResultsScreenProps = {
  result: RQResult;
  clarity: SignalClarity | null;
  submitStatus: { type: "success" | "error"; message: string } | null;
  statusVisible: boolean;
  onRetry?: () => void;
  retrying?: boolean;
};

export function ResultsScreen({
  result,
  clarity,
  submitStatus,
  statusVisible,
  onRetry,
  retrying = false,
}: ResultsScreenProps) {
  return (
    <main className="rq-modern-page rq-results-page">
      <div className="rq-desert-fog-bg" aria-hidden="true">
        <DesertFog />
      </div>
      <div className="rq-modern-container rq-results-container">
        <div className="rq-results-modern">
          <header className="rq-results-header">
            <h1>
              <span className="rq-results-title-line">
                Your{" "}
                <span className="gs-brand">
                  <span className="gs-brand-ghost">GHOST</span>
                  <span className="gs-brand-signal">Signal</span>
                </span>
              </span>
              <span className="rq-results-title-line">Resonance Quotient</span>
            </h1>
          </header>

          {submitStatus && submitStatus.type === "error" ? (
            // Persistent (non-fading) so a taker whose result didn't sync
            // can act on it — with a working Retry.
            <div className="rq-status-modern rq-status-error" role="alert">
              <span>{submitStatus.message}</span>
              {onRetry && (
                <button
                  type="button"
                  className="rq-status-retry"
                  onClick={onRetry}
                  disabled={retrying}
                >
                  {retrying ? "Retrying…" : "Retry"}
                </button>
              )}
            </div>
          ) : (
            submitStatus &&
            statusVisible && (
              <div
                className={`rq-status-modern rq-status-${submitStatus.type} rq-status-fadeout`}
              >
                {submitStatus.message}
              </div>
            )
          )}

          <article className="rq-results-hero">
            <p className="rq-name-display">{result.rqName}</p>
            <p className="rq-code-subtitle">{result.rq}</p>

            {clarity && (
              <div className="rq-clarity">
                <span className="rq-clarity-label">Signal Clarity:</span>
                <span
                  className={`rq-clarity-badge rq-clarity-${clarity.label.toLowerCase()}`}
                >
                  {clarity.label}
                </span>
                <p className="rq-clarity-note">{clarity.note}</p>
              </div>
            )}

            <RQResultsGraph result={result} />
          </article>

          <article className="rq-explanation-section">
            <h2 className="rq-explanation-title">What Does This Mean For You?</h2>

            {AXES.map((axis) => (
              <AxisExplanation
                key={axis.key}
                axis={axis}
                data={result.details[axis.key]}
              />
            ))}

            <div className="rq-numbers-explanation">
              <h3 className="rq-numbers-title">What Do Your Numbers Mean?</h3>
              <p className="rq-numbers-intro">
                Each letter in your RQ is paired with a number from 1 to 10. This
                number reflects how strongly that signal shows up in you.
              </p>
              <ul className="rq-numbers-list">
                <li className="rq-numbers-item-light">
                  <span className="rq-signal-light">Lower numbers (1–3)</span>{" "}
                  indicate an{" "}
                  <span className="rq-signal-light">ambient signal</span>—present,
                  but flexible. You likely have range here and can move across the
                  spectrum without much friction.
                </li>
                <li className="rq-numbers-item-balanced">
                  <span className="rq-signal-balanced">Middle numbers (4–6)</span>{" "}
                  suggest a{" "}
                  <span className="rq-signal-balanced">balanced signal</span>—you
                  have a clear leaning, but with openness. You can adapt without
                  losing yourself.
                </li>
                <li className="rq-numbers-item-strong">
                  <span className="rq-signal-strong">Higher numbers (7–10)</span>{" "}
                  indicate an{" "}
                  <span className="rq-signal-strong">emphatic signal</span>—this
                  is a defining part of how you operate. Alignment here matters
                  more, and mismatches are easier to feel.
                </li>
              </ul>
              <p className="rq-numbers-note">
                This isn&apos;t about better or worse. It&apos;s about clarity and
                intensity—how loudly or quietly each part of your signal comes
                through, and how important it is that others meet you there.
              </p>
            </div>

            <div className="rq-name-explanation">
              <h3 className="rq-name-title">Your Call Sign: {result.rqName}</h3>
              <p className="rq-name-intro">
                The three-word name underneath your RQ score is shorthand for your
                signal.
              </p>
              <p className="rq-name-description">
                Each word corresponds to one axis of the Resonance Quotient—Values,
                Authenticity, and Time Horizon—and reflects both your direction and
                your strength on that axis. Taken together, they form your
                &ldquo;call sign&rdquo;: a quick, intuitive way to understand how
                you interact in partnerships, how you communicate, and how you
                build.
              </p>
              <p className="rq-name-quote">
                &ldquo;It&apos;s not a label to live inside, but a way to recognize
                yourself—and to help others recognize you—at a glance.&rdquo;
              </p>
            </div>
          </article>

          <article className="rq-results-cta-card">
            <p className="rq-email-reminder">
              A detailed analysis has been sent to your email.
            </p>

            <hr className="rq-card-divider" />

            <aside className="rq-founder-inline">
              <p className="rq-founder-text">
                Ready to put your RQ to work?
                <br />
                Let&apos;s talk about partnership opportunities.
              </p>
              <a href="mailto:mike@ghostsignal.cloud" className="rq-founder-email">
                mike@ghostsignal.cloud
              </a>
              <a href="mailto:mike@ghostsignal.cloud" className="rq-founder-card">
                <Image
                  src="/images/brand/GS-EmailSignatures-mikew.gif"
                  alt="Mike Sense - Co-Founder, Vision & Partnerships"
                  className="rq-founder-image"
                  width={640}
                  height={180}
                  unoptimized
                />
              </a>
            </aside>
          </article>

          <aside className="rq-snowdrift-section">
            <div className="rq-snowdrift-snow-bg" aria-hidden="true">
              <SnowAnimation />
            </div>
            <div className="rq-snowdrift-content">
              <Image
                src="/images/brand/snowdrift-logo-white.png"
                alt="Snowdrift"
                className="rq-snowdrift-logo-large"
                width={400}
                height={120}
              />
              <p className="rq-snowdrift-description">
                <span className="rq-snowdrift-tagline">
                  Snowdrift is a{" "}
                  <span className="gs-brand">
                    <span className="gs-brand-ghost">GHOST</span>
                    <span className="gs-brand-signal">Signal</span>
                  </span>{" "}
                  transmission.
                </span>
                Thoughts for a community of world makers. A cultural investigation
                of the future and what it means for you.
              </p>
              <a
                href="https://snowdriftghostsignal.substack.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="rq-cta-btn rq-cta-snowdrift"
              >
                Subscribe to the Snowdrift Newsletter
              </a>
            </div>
          </aside>

          <a
            href="https://ghostsignal.cloud"
            target="_blank"
            rel="noopener noreferrer"
            className="rq-cta-btn rq-cta-primary rq-cta-standalone"
          >
            Discover{" "}
            <span className="gs-brand">
              <span className="gs-brand-ghost">GHOST</span>
              <span className="gs-brand-signal">Signal</span>
            </span>
          </a>
        </div>
      </div>
    </main>
  );
}
