/**
 * Shared types for the Marketing Social Scheduler.
 *
 * Mirrors docs/MARKETING_SOCIAL_SCHEDULER_SCHEMA.sql. One social_posts
 * row may target multiple platforms with optional per-platform body
 * overrides; images live in a child table ordered by `position`.
 */

export type SocialPlatform = "facebook" | "instagram" | "substack";
export type SocialPostStatus = "draft" | "scheduled" | "posted" | "skipped";

export const PLATFORMS: ReadonlyArray<SocialPlatform> = [
  "facebook",
  "instagram",
  "substack",
] as const;

export const STATUSES: ReadonlyArray<SocialPostStatus> = [
  "draft",
  "scheduled",
  "posted",
  "skipped",
] as const;

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  substack: "Substack",
};

export const STATUS_LABELS: Record<SocialPostStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  posted: "Posted",
  skipped: "Skipped",
};

/** Platform brand tints (subtle — match the admin token palette). */
export const PLATFORM_COLORS: Record<SocialPlatform, string> = {
  facebook: "#4267B2",
  instagram: "#E1306C",
  substack: "#FF6719",
};

/* --- Supabase row shapes -------------------------------------------- */

export interface SocialPostRow {
  id: string;
  title: string | null;
  body: string;
  body_facebook: string | null;
  body_instagram: string | null;
  body_substack: string | null;
  platforms: SocialPlatform[];
  scheduled_at: string;
  posted_at: string | null;
  status: SocialPostStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocialPostImageRow {
  id: string;
  post_id: string;
  storage_path: string;
  public_url: string;
  mime_type: string;
  file_size_bytes: number;
  position: number;
  created_at: string;
}

export interface SocialPostWithImages extends SocialPostRow {
  images: SocialPostImageRow[];
}

/* --- Wire shapes ---------------------------------------------------- */

export interface SocialPostCreateInput {
  title?: string | null;
  body: string;
  body_facebook?: string | null;
  body_instagram?: string | null;
  body_substack?: string | null;
  platforms: SocialPlatform[];
  scheduled_at: string;
  status?: SocialPostStatus;
  notes?: string | null;
}

export interface SocialPostPatchInput {
  title?: string | null;
  body?: string;
  body_facebook?: string | null;
  body_instagram?: string | null;
  body_substack?: string | null;
  platforms?: SocialPlatform[];
  scheduled_at?: string;
  posted_at?: string | null;
  status?: SocialPostStatus;
  notes?: string | null;
}

/* --- Body resolution ------------------------------------------------ */

/**
 * Return the right body text for a given platform. Falls back to the
 * default body when no per-platform override exists. Used by the
 * "Prepare to post" modal in Phase C and by the email digest renderer.
 */
export function bodyForPlatform(
  post: SocialPostRow,
  platform: SocialPlatform,
): string {
  if (platform === "facebook" && post.body_facebook) return post.body_facebook;
  if (platform === "instagram" && post.body_instagram)
    return post.body_instagram;
  if (platform === "substack" && post.body_substack) return post.body_substack;
  return post.body;
}
