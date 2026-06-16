"use client";

import dynamic from "next/dynamic";
import { Fragment } from "react";

import { RQ3DWordmark } from "@/app/xq-quiz/Wordmarks3D";

const SimpleFog = dynamic(() => import("./SimpleFog"), { ssr: false });

type IntroStepProps = {
  /** The description string for step 0, pre-newline-split by the caller. */
  description?: string;
};

export function IntroStep({ description }: IntroStepProps) {
  const lines = description?.split("\n") ?? [];

  return (
    <section className="rq-intro">
      <div className="rq-intro-liquid-bg" aria-hidden="true">
        <SimpleFog />
      </div>
      <div className="rq-brand-wordmark" aria-label="RQ">
        <RQ3DWordmark />
      </div>
      <h1 className="rq-intro-title">
        Welcome
        <br />
        to the{" "}
        <span className="gs-brand">
          <span className="gs-brand-ghost">GHOST</span>
          <span className="gs-brand-signal">Signal</span>
        </span>
        <br />
        Resonance Quotient
      </h1>
      <p className="rq-intro-description">
        {lines.map((line, i) => (
          <Fragment key={i}>
            {line}
            {i < lines.length - 1 && <br />}
          </Fragment>
        ))}
      </p>

      <p className="rq-intro-summary">
        The{" "}
        <span className="gs-brand">
          <span className="gs-brand-ghost">GHOST</span>
          <span className="gs-brand-signal">Signal</span>
        </span>{" "}
        Resonance Quotient is a framework for understanding how you signal
        values, build trust, and approach partnerships—helping match creators
        and brands who share aligned visions for world-making.
      </p>

      <details className="rq-intro-extended">
        <summary className="rq-intro-collapsible">
          <span>
            The Research Behind the{" "}
            <span className="gs-brand">
              <span className="gs-brand-ghost">GHOST</span>
              <span className="gs-brand-signal">Signal</span>
            </span>{" "}
            RQ
          </span>
          <span className="rq-profile-toggle" aria-hidden="true"></span>
        </summary>
        <div className="rq-intro-extended-content">
          <p>
            The Resonance Quotient draws on decades of research into how shared
            values create durable, high-trust relationships.
          </p>
          <p>
            Nobel Prize-winning economist Daron Acemoglu&apos;s research
            demonstrates that &ldquo;high-trust circles&rdquo;—groups bound by
            shared values—are self-reinforcing: once they exist, they grow and
            protect themselves, outperforming low-trust systems by orders of
            magnitude. This deeper trust directly translates to greater revenue,
            efficiency, and long-term sustainability.
          </p>
          <p>
            In the attention economy, this matters more than ever. When
            partnerships are built on genuine alignment rather than
            transactional reach, it creates a deeply human bond—one where every
            interaction compounds into community that lasts. The RQ
            doesn&apos;t measure &ldquo;better&rdquo; or &ldquo;worse&rdquo;—it
            maps your unique position across three axes of partnership
            resonance, helping you find collaborators who amplify rather than
            distort your signal.
          </p>
          <nav className="rq-intro-links">
            <a
              href="https://drive.google.com/file/d/1j5eA3-OSEVnx0TP13DoqfsfD-viREGvk/view?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="rq-intro-link"
            >
              Read the{" "}
              <span className="gs-brand">
                <span className="gs-brand-ghost">GHOST</span>
                <span className="gs-brand-signal">Signal</span>
              </span>{" "}
              White Paper →
            </a>
            <a
              href="https://economics.mit.edu/sites/default/files/2023-04/Culture%2C%20Institutions%20and%20Social%20Equilibria%20-%20A%20Framework.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="rq-intro-link"
            >
              Acemoglu on High-Trust Equilibria at MIT →
            </a>
          </nav>
        </div>
      </details>
    </section>
  );
}
