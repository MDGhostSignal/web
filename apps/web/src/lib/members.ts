/**
 * Shared types + constants for the Members CRM.
 *
 * Schema of record lives in docs/CRM_MEMBERS_SCHEMA.sql — keep the
 * `Member` type and the two enum unions below in sync when the
 * Postgres schema changes.
 */

export const MEMBER_TYPES = ["creator", "brand", "other"] as const;
export type MemberType = (typeof MEMBER_TYPES)[number];

export const MEMBER_STAGES = [
  "lead",
  "discern",
  "onboarding",
  "active",
  "paused",
  "churned",
] as const;
export type MemberStage = (typeof MEMBER_STAGES)[number];

/**
 * Human-friendly label for a stage enum value. Used for dropdowns and
 * badges.
 */
export const MEMBER_STAGE_LABELS: Record<MemberStage, string> = {
  lead: "Lead",
  discern: "Discern",
  onboarding: "Onboarding",
  active: "Active",
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
  stage: MemberStage;
  owner: string | null;
  next_step: string | null;
  last_contact_at: string | null;
  notes: string | null;
  tags: string[];
  rq_submission_id: string | null;
};

/**
 * What a POST / PATCH is allowed to set. `id`, `created_at`,
 * `updated_at` are server-managed. We deliberately accept `tags` as
 * `string[] | undefined` so clients that don't touch tags don't have
 * to explicitly pass the empty array.
 */
export type MemberWritable = Partial<Omit<Member, "id" | "created_at" | "updated_at">>;
