/**
 * Shared TypeScript types for the Marketing Copy Library.
 *
 * Mirrors docs/MARKETING_COPY_LIBRARY_SCHEMA.sql. The library is a flat
 * table — one row per phrase — with kind + persona enums driving the
 * sub-tab filters and freeform tags carrying channel / format hints.
 */

export type CopySnippetKind =
  | "tagline"
  | "headline"
  | "subhead"
  | "value_prop"
  | "cta"
  | "social_hook"
  | "long_form"
  | "glossary";

export type CopySnippetPersona = "creators" | "advertisers" | "both";

export const KINDS: ReadonlyArray<CopySnippetKind> = [
  "tagline",
  "headline",
  "subhead",
  "value_prop",
  "cta",
  "social_hook",
  "long_form",
  "glossary",
] as const;

export const PERSONAS: ReadonlyArray<CopySnippetPersona> = [
  "both",
  "creators",
  "advertisers",
] as const;

export const KIND_LABELS: Record<CopySnippetKind, string> = {
  tagline: "Tagline",
  headline: "Headline",
  subhead: "Subhead",
  value_prop: "Value prop",
  cta: "CTA",
  social_hook: "Social hook",
  long_form: "Long-form",
  glossary: "Glossary",
};

export const PERSONA_LABELS: Record<CopySnippetPersona, string> = {
  both: "Both",
  creators: "For creators",
  advertisers: "For advertisers",
};

/* --- Supabase row shape -------------------------------------------- */

export interface CopySnippetRow {
  id: string;
  text: string;
  kind: CopySnippetKind;
  persona: CopySnippetPersona;
  source: string | null;
  tags: string[];
  favorite: boolean;
  created_at: string;
  updated_at: string;
}

/* --- Wire shapes --------------------------------------------------- */

export interface CopySnippetCreateInput {
  text: string;
  kind: CopySnippetKind;
  persona?: CopySnippetPersona;
  source?: string | null;
  tags?: string[];
  favorite?: boolean;
}

export interface CopySnippetPatchInput {
  text?: string;
  kind?: CopySnippetKind;
  persona?: CopySnippetPersona;
  source?: string | null;
  tags?: string[];
  favorite?: boolean;
}
