/**
 * Shared types + constants for the Members CRM.
 *
 * Schema of record lives in docs/CRM_MEMBERS_SCHEMA.sql plus the v2
 * migration in docs/CRM_MEMBERS_SCHEMA_V2.sql — keep the `Member`
 * type, the phase enum, and the lifecycle-step catalog in sync when
 * the Postgres schema changes.
 */

import { supabaseRest } from "@/lib/supabase-admin";

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
  /** Used for steps the member themselves drives (e.g. completing the
   *  RQ / XQ quiz). Reads accurately for both creators and brands —
   *  preferred over "Creator" when the action isn't creator-specific. */
  "Member",
] as const;
export type StepOwnerRole = (typeof STEP_OWNER_ROLES)[number];

export type LifecycleStepDef = {
  key: string;
  label: string;
  phase: Exclude<MemberPhase, "paused" | "churned">;
  ownerRole: StepOwnerRole;
  creatorOnly?: boolean;
};

/**
 * Full lifecycle definition. Each surface renders only the slice it
 * cares about:
 *  - /admin/contacts renders Discern + Court on the lead card (the new
 *    six-stage reach-out stepper is derived separately; these are the
 *    legacy checkpoints).
 *  - /admin/marketplace (pool) renders the Onboard slice (5 steps) on
 *    the expanded member row, since marketplace members are
 *    post-graduation and the onboarding work happens there.
 *
 * Keeping all in one place means `sanitizeLifecycleSteps` accepts the
 * keys for both surfaces (the per-surface filtering is purely a render
 * concern) and a row carries its full history regardless of which page
 * is editing it.
 */
export const LIFECYCLE_STEPS: readonly LifecycleStepDef[] = [
  // ---- Leads surface (Discern + Court) -----------------------------
  // Discern
  { key: "discernment", label: "Discernment", phase: "discern", ownerRole: "Founder" },
  // Court
  { key: "first_contact", label: "First Contact", phase: "court", ownerRole: "Founder" },
  { key: "meeting", label: "Meeting", phase: "court", ownerRole: "Founder" },
  { key: "deck_sent", label: "Deck sent", phase: "court", ownerRole: "Founder" },
  { key: "ad_copy_sent", label: "Ad Copy Guidelines sent", phase: "court", ownerRole: "Founder" },
  { key: "rq_quiz", label: "RQ quiz", phase: "court", ownerRole: "Founder" },
  // ---- Marketplace surface (Onboard) ------------------------------
  // The 5-step onboarding checklist (Martin's 2026-08-07 spec), in
  // order. All live in the `onboard` phase so the marketplace stepper
  // renders them as one flat sequence. Mercury / Tax steps are
  // creator-only (brands pay, they don't receive payouts).
  { key: "welcome_box", label: "Welcome Box Sent", phase: "onboard", ownerRole: "Ops" },
  { key: "studio_invite_sent", label: "Studio Invite Sent", phase: "onboard", ownerRole: "Ops" },
  { key: "mercury_tax_sent", label: "Mercury / Tax Sent", phase: "onboard", ownerRole: "Finance", creatorOnly: true },
  { key: "studio_profile_completed", label: "Studio Profile Completed", phase: "onboard", ownerRole: "Member" },
  { key: "mercury_tax_completed", label: "Mercury / Tax Completed", phase: "onboard", ownerRole: "Finance", creatorOnly: true },
] as const;

/**
 * Extra lifecycle_steps keys the Contacts reach-out stepper writes
 * (1st / 2nd reach-out markers). They are NOT catalog steps — they don't
 * render in any phase checklist — but they must survive the members API's
 * `sanitizeLifecycleSteps` whitelist, so they're allowlisted there
 * alongside LIFECYCLE_STEPS. See ContactLifecycleStepper.deriveStatus.
 */
export const CONTACT_STEPPER_STEP_KEYS = [
  "first_reachout",
  "second_reachout",
] as const;

/**
 * Step keys that surface on the marketplace pool expanded row — the
 * post-graduation onboarding slice (Sign + Onboard + Run phases). Today
 * that's the 5 Onboard steps; the filter stays phase-based so adding a
 * Sign/Run step later needs no change here.
 */
export const MARKETPLACE_LIFECYCLE_KEYS = LIFECYCLE_STEPS.filter(
  (s) => s.phase === "sign" || s.phase === "onboard" || s.phase === "run",
).map((s) => s.key);

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
  /** Embedded from the linked creators row by GET /api/members
   *  (select=*,creators(rss_url)) — the show's RSS feed, shown in the
   *  contacts CRM. Absent on writes and on the embed-less fallback. */
  creators?: { rss_url: string | null } | null;
  /** Newsletter-advertising opt-in captured at Studio registration /
   *  profile (docs/STUDIO_NL_ADVERTISING.sql). Read-only in the CRM;
   *  sanitizePayload strips these on writes. */
  nl_ads_interest?: boolean | null;
  nl_provider?: string | null;
  nl_open_rate?: string | null;
  nl_frequency?: string | null;
  nl_subscribers?: string | null;
  /** Podcast info from /studio/profile (docs/STUDIO_POD_INFO.sql +
   *  STUDIO_POD_LISTENS.sql). */
  pod_provider?: string | null;
  pod_monthly_listens?: string | null;
  pod_frequency?: string | null;
  phase: MemberPhase;
  phase_entered_at: string;
  owner: string | null;
  next_step: string | null;
  last_contact_at: string | null;
  /** Free-text capture of the lead's most recent response, e.g.
      "Wants to revisit in Q3" or "Asked for case studies". */
  last_response: string | null;
  /** Categorical traffic-light bucket for the most recent reply.
      Drives the lifecycle stepper on /admin/contacts. NULL means
      "no categorical reply recorded" — the contact may still have
      free-text `last_response` content. See
      docs/CRM_MEMBERS_RESPONSE_KIND_MIGRATION.sql. */
  response_kind: "no" | "interested" | null;
  /** Number of outreach touches against this lead. Incremented manually
      by the founders as they reach out (call, email, DM, etc.). */
  contact_count: number | null;
  /** Timestamp set when the founders mark this lead as having graduated
      to a full GhostSignal member. Null = still a lead. Setting this
      grays the row in /admin/leads and surfaces the person in the
      marketplace pool on /admin/marketplace. */
  became_member_at: string | null;
  notes: string | null;
  tags: string[];
  lifecycle_steps: LifecycleSteps;
  rq_submission_id: string | null;
  /** Pointer to the member's XQ Conviction Quotient submission, if they
      have completed the XQ quiz. Set when the public XQ quiz POSTs
      with an email that matches this member. See docs/CRM_XQ_SUBMISSIONS_SCHEMA.sql. */
  xq_submission_id: string | null;
  /** Shipping address — populated when the team needs to mail
      membership boxes / branded swag. All six fields are optional;
      backfilled per-member as the team gathers them. See
      docs/CRM_MEMBERS_SHIPPING_FIELDS_MIGRATION.sql. */
  shipping_address_line1: string | null;
  shipping_address_line2: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_postal_code: string | null;
  shipping_country: string | null;
  /** Public CDN URL for the member's avatar / brand logo. Populated by
      POST /api/members/[id]/avatar; null when no image has been
      uploaded yet. See docs/CRM_MEMBERS_AVATAR_MIGRATION.sql. */
  avatar_url: string | null;
  /** Date the membership contract was signed (YYYY-MM-DD). Drives
      the contract_expiring alert via `contract_signed_at +
      contract_term_months` → renewal date. Null = no contract on file
      yet (e.g. pre-sign members). See
      docs/CRM_MEMBERS_CONTRACT_FIELDS_MIGRATION.sql. */
  contract_signed_at: string | null;
  /** Length of the current contract in months. Defaults to 12 (the
      standard annual agreement). Range 1–60 enforced server-side. */
  contract_term_months: number;
  /** Manually-assigned 4-digit membership number (1..9999). Null until
      the member is fully signed up (both `became_member_at` and
      `contract_signed_at` set) and an admin has assigned the next
      sequential value. Rendered on the welcome card as "№ NNNN".
      See docs/CRM_MEMBERS_NUMBER_MIGRATION.sql. */
  member_number: number | null;
};

/**
 * What a POST / PATCH is allowed to set. `id`, `created_at`,
 * `updated_at`, and `phase_entered_at` are server-managed.
 */
export type MemberWritable = Partial<
  Omit<Member, "id" | "created_at" | "updated_at" | "phase_entered_at">
>;

/* =====================================================================
 * Marketplace bridge — convert a graduated lead (a Member with
 * `became_member_at` set) into the shape the marketplace pool consumes.
 * The pool component lives at /admin/marketplace and renders both the
 * seed mocks (from `marketplace-mocks.ts`) and any rows produced by
 * this converter, so a founder marking "has become a GhostSignal
 * member" on a lead surfaces the same person in the pool automatically.
 *
 * Trait scores default to a neutral 50/50/50 until the member completes
 * the RQ quiz — at that point a follow-up pass can pull their
 * rq_submission_id and compute real per-axis values. RQ code / name
 * placeholder ("RQ-?") signals "no RQ data yet" in the UI.
 * ===================================================================== */

export type MarketplaceLite = {
  id: string;
  kind: "creator" | "brand";
  name: string;
  rq_code: string;
  rq_name: string;
  tags: readonly string[];
  blurb: string;
  traits: { values: number; authenticity: number; horizon: number };
  is_mock: boolean;
};

/**
 * Returns null when the member can't be represented in the pool —
 * either they haven't graduated (no `became_member_at`) or their
 * member_type isn't a marketplace kind (only "creator" / "brand"
 * map; "other" rows are excluded).
 */
export function memberToMarketplaceEntity(m: Member): MarketplaceLite | null {
  if (!m.became_member_at) return null;
  if (m.member_type !== "creator" && m.member_type !== "brand") return null;

  const name =
    [m.first_name, m.last_name].filter(Boolean).join(" ").trim() ||
    m.organization ||
    "(unnamed member)";

  return {
    // `mem-` prefix avoids id collisions with the seed-mock c-NN / b-NN
    // pool ids — important so match-store lookups stay deterministic.
    id: `mem-${m.id}`,
    kind: m.member_type,
    name,
    rq_code: m.rq_submission_id ? "RQ-?" : "RQ-?",
    rq_name: m.rq_submission_id ? "RQ pending" : "RQ pending",
    tags: m.tags,
    blurb: m.notes?.slice(0, 140) ?? `Real ${m.member_type} member.`,
    traits: { values: 50, authenticity: 50, horizon: 50 },
    is_mock: false,
  };
}

/* =====================================================================
 * Server-side lookups (used by integrations like the Contracts feature)
 * ===================================================================== */

/**
 * Find member rows whose `email` (case-insensitive) matches `email`.
 * Returns 0, 1, or many — caller decides what to do (the Contracts
 * feature treats 1 as "auto-suggest", 0 as "no link", >1 as "ambiguous,
 * don't suggest").
 *
 * Kept here so the webhook receiver + import-by-id + create-from-CRM
 * flows all use the same matcher.
 */
export async function findMembersByEmail(
  email: string,
): Promise<Array<{ id: string; first_name: string | null; last_name: string | null; organization: string | null; member_type: MemberType }>> {
  const normalised = email.trim().toLowerCase();
  if (!normalised || !normalised.includes("@")) return [];
  const res = await supabaseRest<
    Array<{ id: string; first_name: string | null; last_name: string | null; organization: string | null; member_type: MemberType }>
  >(
    `members?select=id,first_name,last_name,organization,member_type&email=ilike.${encodeURIComponent(normalised)}&limit=5`,
  );
  if (!res.ok) return [];
  return res.data;
}
