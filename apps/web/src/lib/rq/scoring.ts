/**
 * RQ Index Scoring Logic
 */

import { WORDS, DESCRIPTIONS } from "./constants";

export type RQAnswers = {
  // Basics
  TYPE: string;
  FIRST: string;
  LAST: string;
  ROLE: string;
  ORG: string;
  INDUSTRY: string;
  WEBSITE: string;
  EMAIL: string;
  // Values Orientation
  VO1: number;
  VO2: number;
  VO3: string;
  VO4: string;
  VO5: number;
  // Authenticity Expression
  AE1: string;
  AE2: number;
  AE3: string;
  AE4: number;
  AE5: number;
  // Flourishing Horizon
  FH1: string;
  FH2: number;
  FH3: string;
  FH4: string;
  FH5: number;
  // Undertone
  U1?: string;
  // Signal clarity tracking
  npCount: number;
  totalCount: number;
};

export type RQResult = {
  rq: string;
  rqName: string;
  details: {
    values: { letter: string; score: number; band: string };
    authenticity: { letter: string; score: number; band: string };
    horizon: { letter: string; score: number; band: string };
  };
  profile: {
    values: string;
    authenticity: string;
    horizon: string;
  };
};

export type SignalClarity = {
  label: "High" | "Medium" | "Low";
  note: string;
};

// Helper functions
// Bands match the DESCRIPTIONS array: 1-3 (index 0), 4-5 (index 1), 6-10 (index 2)
const bandIndex = (n: number): 0 | 1 | 2 => (n <= 3 ? 0 : n <= 5 ? 1 : 2);
const bandLabel = (n: number): string => (n <= 3 ? "1–3" : n <= 5 ? "4–5" : "6–10");
const clamp1to10 = (n: number): number => Math.max(1, Math.min(10, n));
const round = (n: number): number => Math.round(n);
const avg = (arr: number[]): number => arr.reduce((a, b) => a + b, 0) / arr.length;

/**
 * Compute signal clarity based on "No preference" count
 */
export function computeSignalClarity(npCount: number, totalCount: number): SignalClarity {
  const pct = totalCount ? npCount / totalCount : 0;
  if (pct <= 0.2) {
    return {
      label: "High",
      note: "Your signal is well-defined—clear preferences give us sharper matching.",
    };
  }
  if (pct <= 0.45) {
    return {
      label: "Medium",
      note: "Your signal is taking shape—some preferences are clear, others are open.",
    };
  }
  return {
    label: "Low",
    note: "Your signal is intentionally open—great for exploration, less precise for matching.",
  };
}

/**
 * Compute RQ code, name, and profile from answers
 */
export function computeRQ(answers: RQAnswers): RQResult {
  // Values Orientation
  const VO3_pts = answers.VO3 === "Yes" ? 2 : 0;
  const VO4_pts = answers.VO4.includes("(Formative)") ? 2 : 0;
  const F_score = clamp1to10(
    round(avg([answers.VO1, answers.VO2, answers.VO5, 5 + VO3_pts, 5 + VO4_pts])),
  );
  const V_letter = F_score >= 6 ? "F" : "I";

  // Authenticity Expression
  const AE1_pts_S = answers.AE1.includes("(Structural)")
    ? 2
    : answers.AE1 === "No preference"
      ? 0
      : -2;
  const AE3_pts_S = answers.AE3.includes("(Structural)")
    ? 2
    : answers.AE3 === "No preference"
      ? 0
      : -2;
  const S_score = clamp1to10(
    round(avg([answers.AE2, answers.AE4, answers.AE5, 5 + AE1_pts_S, 5 + AE3_pts_S])),
  );
  const A_letter = S_score >= 6 ? "S" : "R";
  const A_strength = S_score >= 6 ? S_score : 11 - S_score;

  // Flourishing Horizon
  const FH1_pts_L = answers.FH1.includes("(Long-Arc)") ? 2 : 0;
  const FH3_pts_L = answers.FH3.includes("(Long-Arc)") ? 2 : 0;
  const FH4_pts_L = answers.FH4.includes("(Long-Arc)") ? 2 : 0;
  const L_score = clamp1to10(
    round(avg([answers.FH2, answers.FH5, 5 + FH1_pts_L, 5 + FH3_pts_L, 5 + FH4_pts_L])),
  );
  const H_letter = L_score >= 6 ? "L" : "C";
  const H_strength = L_score >= 6 ? L_score : 11 - L_score;

  // Build RQ code and name
  const rq = `${V_letter}(${F_score})-${A_letter}(${A_strength})-${H_letter}(${H_strength})`;
  const rqName = `${WORDS.Values[V_letter][bandIndex(F_score)]} ${WORDS.Authenticity[A_letter][bandIndex(A_strength)]} ${WORDS.Horizon[H_letter][bandIndex(H_strength)]}`;

  // Get profile descriptions
  const profile = {
    values: DESCRIPTIONS.Values[V_letter][bandIndex(F_score)],
    authenticity: DESCRIPTIONS.Authenticity[A_letter][bandIndex(A_strength)],
    horizon: DESCRIPTIONS.Horizon[H_letter][bandIndex(H_strength)],
  };

  return {
    rq,
    rqName,
    details: {
      values: { letter: V_letter, score: F_score, band: bandLabel(F_score) },
      authenticity: { letter: A_letter, score: A_strength, band: bandLabel(A_strength) },
      horizon: { letter: H_letter, score: H_strength, band: bandLabel(H_strength) },
    },
    profile,
  };
}
