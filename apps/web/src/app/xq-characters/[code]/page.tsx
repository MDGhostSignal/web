"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";

import { ResultsScreen } from "@/app/xq-quiz/ResultsScreen";
import "@/app/xq-quiz/xq-quiz.css";
import { ARCHETYPES, type ArchetypeCode } from "@/lib/xq/constants";
import type { XQResult } from "@/lib/xq/scoring";

const VALID_CODES: ArchetypeCode[] = [
  "C-P-C",
  "C-P-L",
  "C-S-C",
  "C-S-L",
  "X-P-C",
  "X-P-L",
  "X-S-C",
  "X-S-L",
];

/**
 * /xq-characters/[code] — internal preview route. Renders the full
 * /xq-quiz ResultsScreen for any archetype code without making you
 * take the quiz. Lets us iterate on the reveal visuals (character
 * portrait, spectrum-map highlight, per-archetype theming, animation
 * timing) for all 8 personas in seconds.
 *
 * Mock data is deterministic — strong-but-not-clean scores per axis
 * so the user point lands inside the archetype's quadrant on the
 * spectrum map but slightly off-anchor, giving us a realistic preview.
 */
export default function XQArchetypePreviewPage() {
  const params = useParams<{ code: string }>();
  const code = params.code?.toUpperCase() as ArchetypeCode | undefined;

  if (!code || !VALID_CODES.includes(code)) {
    notFound();
  }

  const result = buildMockResult(code);

  // The parent xq-characters layout provides the dark page backdrop +
  // a back-to-home pill, so we render the reveal inline inside an
  // 860-wide column matching the quiz's content well.
  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <PreviewBanner code={code} />
      <ResultsScreen result={result} submitStatus={{ type: "idle" }} />
    </div>
  );
}

function PreviewBanner({ code }: { code: ArchetypeCode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 14px",
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: 10,
        marginBottom: 24,
        fontSize: 12,
        color: "#8b97a3",
        fontFamily: "Inter, ui-monospace, monospace",
        letterSpacing: 0.6,
      }}
    >
      <span>
        PREVIEW · {code} reveal · mock data — not a real submission.
      </span>
      <Link
        href="/xq-characters"
        style={{
          color: "#bcbcbc",
          textDecoration: "none",
          fontSize: 11,
          letterSpacing: 1.2,
          textTransform: "uppercase",
        }}
      >
        Back to gallery →
      </Link>
    </div>
  );
}

/** Build a deterministic mock XQResult for the given archetype code.
 *  Scores are calibrated so the winning side reads as a strong
 *  preference (~67% confidence) without being a clean sweep — that
 *  way the spectrum-map user dot lands clearly inside the archetype's
 *  zone but slightly off-anchor, which is what real results look
 *  like. */
function buildMockResult(code: ArchetypeCode): XQResult {
  const [a1, a2, a3] = code.split("-") as ["C" | "X", "P" | "S", "C" | "L"];

  const win = 6;
  const lose = 3;

  const vectorBias = [
    a1 === "C" ? "Continuity" : "Change",
    a2 === "P" ? "Person" : "System",
    a3 === "C" ? "Craft" : "Leverage",
  ].join(" · ");

  return {
    code,
    archetype: ARCHETYPES[code],
    details: {
      axis1: { letter: a1, score: win, opposingScore: lose },
      axis2: { letter: a2, score: win, opposingScore: lose },
      axis3: { letter: a3, score: win, opposingScore: lose },
    },
    selectedValuesPool: [
      "Capital Preservation",
      "Sustainability",
      "Long-Term Viability",
      "Individual Agency",
      "Radical Hospitality",
      "Exploitation Resistance",
      "Paradigm Disruption",
      "Aesthetic Excellence",
      "Moral Accountability",
      "Rule of Law",
      "Creator Equity",
      "Anti-Extractive Systems",
      "Sacred Vocation",
      "Antifragility",
    ],
    buckets: {
      nonNegotiables: [
        "Sacred Vocation",
        "Anti-Extractive Systems",
        "Aesthetic Excellence",
      ],
      core: [
        "Capital Preservation",
        "Radical Hospitality",
        "Moral Accountability",
        "Creator Equity",
      ],
      aspirational: ["Antifragility", "Paradigm Disruption"],
      background: [
        "Sustainability",
        "Long-Term Viability",
        "Individual Agency",
        "Exploitation Resistance",
        "Rule of Law",
      ],
    },
    vectorBias,
  };
}
