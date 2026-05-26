/** Local shared types for the XQ quiz client. Wire payloads + scoring
 *  shapes live in @/lib/xq/scoring and @/app/api/xq-submissions/types
 *  — this file is just the UI-side glue. */

export type Basics = {
  first: string;
  last: string;
  email: string;
  org: string;
  role: string;
  industry: string;
  website: string;
  type: string;
};

export const EMPTY_BASICS: Basics = {
  first: "",
  last: "",
  email: "",
  org: "",
  role: "",
  industry: "",
  website: "",
  type: "",
};

/** Stage in the quiz state machine. */
export type Stage =
  | "intro"
  | "contact"
  | "phase1"
  | "phase2"
  | "phase3"
  | "results";
