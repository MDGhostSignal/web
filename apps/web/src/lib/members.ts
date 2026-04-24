/**
 * Shared types + constants for the Members CRM.
 *
 * Schema of record lives in docs/CRM_MEMBERS_SCHEMA.sql plus the v2
 * migration in docs/CRM_MEMBERS_SCHEMA_V2.sql — keep the `Member`
 * type, the phase enum, and the lifecycle-step catalog in sync when
 * the Postgres schema changes.
 */

export const MEMBER_TYPES = ["creator", "brand", "other"] as const;
export type MemberType = (typeof MEMBER_TYPES)[number];

/**
 * Five macro phases for the pipeline plus two off-pipeline states
 * (paused / churned). Replaces the earlier `member_stage` enum.
 * Ordering mirrors the canonical progression so `ORDER BY phase`
 * sorts the pipeline left-to-right.
 */
export const MEMBER_PHASES = [
  "discern",
  "court",
  "sign",
  "onboard",
  "run",
  "paused",
  "churned",
] as const;
export type MemberPhase = (typeof MEMBER_PHASES)[number];

export const MEMBER_PHASE_LABELS: Record<MemberPhase, string> = {
  discern: "Discern",
  court: "Court",
  sign: "Sign",
  onboard: "Onboard",
  run: "Run",
  paused: "Paused",
  churned: "Churned",
};

export const MEMBER_TYPE_LABELS: Record<MemberType, string> = {
  creator: "Creator",
  brand: "Brand",
  other: "Other",
};

/**
 * Canonical team owners for the `owner` column. Kept here so the UI
 * dropdown doesn't drift from what the API / DB expects.
 */
export const MEMBER_OWNERS = [
  "Mike Sense",
  "Jack W Harding",
  "Martin Drexler",
  "Jeremy Reeves",
] as const;
export type MemberOwner = (typeof MEMBER_OWNERS)[number];

/* =====================================================================
 * Lifecycle steps — Jack's 12 checkpoints, phase-grouped.
 *
 * Each step carries:
 *   - key         stable identifier (what lives in the jsonb blob)
 *   - label       UI label
 *   - phase       which macro phase this step lives inside
 *   - ownerRole   who drives it (Founder / Ops / Finance / Creator)
 *   - creatorOnly when true, shown as N/A for non-creator members
 * ===================================================================== */

export const STEP_OWNER_ROLES = [
  "Founder",
  "Ops",
  "Finance",
  "Creator",
] as const;
export type StepOwnerRole = (typeof STEP_OWNER_ROLES)[number];

export type LifecycleStepDef = {
  key: string;
  label: string;
  phase: Exclude<MemberPhase, "paused" | "churned">;
  ownerRole: StepOwnerRole;
  creatorOnly?: boolean;
};

export const LIFECYCLE_STEPS: readonly LifecycleStepDef[] = [
  // Discern
  { key: "discernment", label: "Discernment", phase: "discern", ownerRole: "Founder" },
  // Court
  { key: "first_contact", label: "First Contact", phase: "court", ownerRole: "Founder" },
  { key: "meeting", label: "Meeting", phase: "court", ownerRole: "Founder" },
  { key: "deck_sent", label: "Deck sent", phase: "court", ownerRole: "Founder" },
  { key: "ad_copy_sent", label: "Ad Copy Guidelines sent", phase: "court", ownerRole: "Founder" },
  { key: "rq_quiz", label: "RQ quiz", phase: "court", ownerRole: "Founder" },
  // Sign
  { key: "membership_sent", label: "Membership Sent", phase: "sign", ownerRole: "Ops" },
  { key: "membership_signed", label: "Membership Signed", phase: "sign", ownerRole: "Ops" },
  // Onboard
  { key: "welcome_box", label: "Welcome Email + Box", phase: "onboard", ownerRole: "Ops" },
  { key: "mercury_w9", label: "Mercury / W9", phase: "onboard", ownerRole: "Finance", creatorOnly: true },
  { key: "show_info", label: "Show Info Received", phase: "onboard", ownerRole: "Ops", creatorOnly: true },
  { key: "art19_migration", label: "ART19 Migration", phase: "onboard", ownerRole: "Ops", creatorOnly: true },
  // Run
  { key: "campaign_planning", label: "Campaign Planning + Execution", phase: "run", ownerRole: "Ops" },
] as const;

export const STEP_STATUSES = ["todo", "doing", "done", "skipped", "na"] as const;
export type StepStatus = (typeof STEP_STATUSES)[number];

export type LifecycleStepState = {
  status: StepStatus;
  completed_at: string | null; // ISO date (YYYY-MM-DD) — set when status flips to "done"
};

/** Full checklist state stored in the `lifecycle_steps` jsonb column. */
export type LifecycleSteps = Record<string, LifecycleStepState>;

/**
 * Build the default checklist for a new member. Creator-only steps
 * default to `na` for non-creator members so they don't inflate the
 * total / drag down the progress ratio.
 */
export function initLifecycleSteps(memberType: MemberType): LifecycleSteps {
  const out: LifecycleSteps = {};
  for (const step of LIFECYCLE_STEPS) {
    const isNa = step.creatorOnly && memberType !== "creator";
    out[step.key] = {
      status: isNa ? "na" : "todo",
      completed_at: null,
    };
  }
  return out;
}

/**
 * Return { done, total } where `total` excludes steps marked `na` so
 * the progress pill always reads out of the *applicable* step count.
 */
export function countCompleted(
  steps: LifecycleSteps | null | undefined,
  memberType: MemberType,
): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const def of LIFECYCLE_STEPS) {
    const state = steps?.[def.key];
    const effective: StepStatus =
      state?.status ??
      (def.creatorOnly && memberType !== "creator" ? "na" : "todo");
    if (effective === "na") continue;
    total += 1;
    if (effective === "done") done += 1;
  }
  return { done, total };
}

/**
 * Days between now and `isoTs`. Used for the rot dot — if a member
 * has been in the current phase longer than ROT_THRESHOLD_DAYS, the
 * row gets flagged.
 */
export function daysSince(isoTs: string | null | undefined): number | null {
  if (!isoTs) return null;
  const t = new Date(isoTs).getTime();
  if (Number.isNaN(t)) return null;
  const ms = Date.now() - t;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/** "Rot" threshold in days — tuned in one place. */
export const ROT_THRESHOLD_DAYS = 14;

/* =====================================================================
 * Member record shape
 * ===================================================================== */

export type Member = {
  id: string;
  created_at: string;
  updated_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  member_type: MemberType;
  organization: string | null;
  role: string | null;
  website: string | null;
  phase: MemberPhase;
  phase_entered_at: string;
  owner: string | null;
  next_step: string | null;
  last_contact_at: string | null;
  notes: string | null;
  tags: string[];
  lifecycle_steps: LifecycleSteps;
  rq_submission_id: string | null;
};

/**
 * What a POST / PATCH is allowed to set. `id`, `created_at`,
 * `updated_at`, and `phase_entered_at` are server-managed.
 */
export type MemberWritable = Partial<
  Omit<Member, "id" | "created_at" | "updated_at" | "phase_entered_at">
>;
