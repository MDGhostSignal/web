/**
 * XQ Submission types — the wire shape exchanged between
 *   public quiz (`/xq-quiz`)  →  POST /api/xq-submissions
 * and the admin viewers.
 *
 * Mirrors `src/app/api/rq-submissions/types.ts` in spirit but carries
 * XQ-specific result fields (archetype + value buckets) instead of
 * the RQ axis triplet + clarity tracking.
 */

export type XQSubmissionStatus = "incomplete" | "complete";

export type XQSubmissionPayload = {
  source?: string;
  submittedAt?: string;
  status?: XQSubmissionStatus;
  brand?: {
    company?: string;
    acronym?: string;
    title?: string;
  };
  basics?: {
    type?: string;
    first?: string;
    last?: string;
    role?: string;
    org?: string;
    industry?: string;
    website?: string;
    email?: string;
  };
  /** Phase 1 + Phase 2 answers + Phase 3 stress-test inputs, all in
   *  one bag so the API gets a forensic snapshot. */
  answers?: Record<string, unknown>;
  result?: {
    /** 3-letter archetype code, e.g. "C-P-C". */
    code?: string;
    /** Human label, e.g. "The Steward". */
    archetypeName?: string;
    /** Short descriptor, e.g. "The Guardian of Sacred Fire." */
    archetypeTagline?: string;
    /** Long archetype description block. */
    profile?: unknown;
    /** Per-axis triangulation breakdown (letters + scores). */
    details?: {
      axis1?: { letter?: string; score?: number; opposingScore?: number };
      axis2?: { letter?: string; score?: number; opposingScore?: number };
      axis3?: { letter?: string; score?: number; opposingScore?: number };
    };
    /** Human-readable triangulated vector bias, e.g.
     *  "Continuity · Person · Craft". */
    vectorBias?: string;
    /** The four value buckets from Phase 3 stress tests. */
    buckets?: {
      nonNegotiables?: string[];
      core?: string[];
      aspirational?: string[];
      background?: string[];
    };
  };
  meta?: {
    pageUrl?: string;
    referrer?: string;
    userAgent?: string;
  };
};
