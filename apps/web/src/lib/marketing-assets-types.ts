/**
 * Shared TypeScript types for the Marketing Asset Library.
 *
 * Mirrors the schema in docs/MARKETING_ASSETS_SUPABASE_SCHEMA.sql. The
 * two-table shape (asset + many files) lets one logical asset like
 * "GhostSignal Brandmark, White" carry multiple file variants (SVG,
 * EPS, PNG @1x/@2x/@4x, WebP) — designers' mental model.
 */

export type MarketingAssetCategory = "brand" | "marketing" | "docs";
export type MarketingAssetSource = "drive_url" | "storage" | "static";

export const CATEGORY_LABELS: Record<MarketingAssetCategory, string> = {
  brand: "Brand",
  marketing: "Marketing",
  docs: "Docs",
};

export const CATEGORIES: ReadonlyArray<MarketingAssetCategory> = [
  "brand",
  "marketing",
  "docs",
] as const;

/* --- Supabase row shapes (what the dashboard consumes) --------------- */

export interface MarketingAssetRow {
  id: string;
  title: string;
  description: string | null;
  category: MarketingAssetCategory;
  tags: string[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface MarketingAssetFileRow {
  id: string;
  asset_id: string;
  variant_label: string | null;
  mime_type: string;
  file_size_bytes: number;
  source_type: MarketingAssetSource;
  /** Exactly one of these three is populated (enforced by SQL check constraint). */
  storage_path: string | null;
  static_public_url: string | null;
  external_url: string | null;
  is_primary: boolean;
  created_at: string;
}

/** Convenience type for the dashboard: asset bundled with its files. */
export interface MarketingAssetWithFiles extends MarketingAssetRow {
  files: MarketingAssetFileRow[];
}

/* --- Wire shapes for create/edit -------------------------------------- */

export interface MarketingAssetCreateInput {
  title: string;
  description?: string | null;
  category: MarketingAssetCategory;
  tags?: string[];
}

export interface MarketingAssetPatchInput {
  title?: string;
  description?: string | null;
  category?: MarketingAssetCategory;
  tags?: string[];
}
