"use client";

import { useState } from "react";

import { Badge, Button } from "@/components/admin";
import { formatFileSize } from "@/lib/marketing-assets";
import { CATEGORY_LABELS } from "@/lib/marketing-assets-types";
import type {
  MarketingAssetFileRow,
  MarketingAssetPatchInput,
  MarketingAssetWithFiles,
} from "@/lib/marketing-assets-types";

import styles from "../marketing.module.css";

import { AssetForm } from "./AssetForm";
import { VariantUpload } from "./VariantUpload";

type Props = {
  asset: MarketingAssetWithFiles;
  onSaved: () => void;
  onDeleted: () => void;
};

type Mode = "view" | "edit";

/**
 * Detail modal body: view mode shows hero + metadata + variants;
 * edit mode swaps the body in-place for the AssetForm. Variant
 * uploads and per-variant deletes are always available in view mode.
 */
export function AssetDetail({ asset, onSaved, onDeleted }: Props) {
  const [mode, setMode] = useState<Mode>("view");
  const [deleting, setDeleting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const primary = asset.files.find((f) => f.is_primary) ?? asset.files[0];
  const heroUrl = primary ? resolveFileUrl(primary) : null;
  const heroIsImage = primary ? isImageMime(primary.mime_type) : false;

  async function handleSave(patch: MarketingAssetPatchInput): Promise<void> {
    const res = await fetch(
      `/api/admin/marketing-assets/${encodeURIComponent(asset.id)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      },
    );
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Save failed (${res.status}): ${detail.slice(0, 200)}`);
    }
    setMode("view");
    onSaved();
  }

  async function handleDelete(): Promise<void> {
    if (
      !window.confirm(
        `Delete "${asset.title}" and all ${asset.files.length} file variant${
          asset.files.length === 1 ? "" : "s"
        }? This cannot be undone.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    setErrorBanner(null);
    try {
      const res = await fetch(
        `/api/admin/marketing-assets/${encodeURIComponent(asset.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`Delete failed (${res.status}): ${detail.slice(0, 200)}`);
      }
      onDeleted();
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  }

  async function handleVariantDelete(fileId: string): Promise<void> {
    if (!window.confirm("Delete this file variant?")) return;
    setErrorBanner(null);
    try {
      const res = await fetch(
        `/api/admin/marketing-assets/${encodeURIComponent(asset.id)}/files/${encodeURIComponent(fileId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(
          `Variant delete failed (${res.status}): ${detail.slice(0, 200)}`,
        );
      }
      onSaved();
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : String(err));
    }
  }

  if (mode === "edit") {
    return (
      <AssetForm
        initial={asset}
        onSubmit={handleSave}
        onCancel={() => setMode("view")}
        submitLabel="Save changes"
      />
    );
  }

  return (
    <div className={styles.detail}>
      <div className={styles.detailHero}>
        {heroUrl && heroIsImage && (
          // Same rationale as AssetCard — mixed-source URLs, next/image's
          // loader is not the right tool for internal admin previews.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroUrl} alt={asset.title} />
        )}
        {heroUrl && !heroIsImage && primary?.mime_type === "application/pdf" && (
          <object
            className={styles.detailHeroPdf}
            data={`${heroUrl}#view=FitH`}
            type="application/pdf"
            aria-label={`${asset.title} (PDF preview)`}
          >
            <span className={styles.detailHeroFallback}>PDF</span>
          </object>
        )}
        {heroUrl && !heroIsImage && primary?.mime_type?.startsWith("video/") && (
          <video
            className={styles.detailHeroVideo}
            src={heroUrl}
            controls
            preload="metadata"
          />
        )}
        {(!heroUrl ||
          (!heroIsImage &&
            primary?.mime_type !== "application/pdf" &&
            !primary?.mime_type?.startsWith("video/"))) && (
          <span className={styles.detailHeroFallback}>
            {primary ? formatMimeBadge(primary.mime_type) : "No preview"}
          </span>
        )}
      </div>

      {asset.description && (
        <p className={styles.detailDescription}>{asset.description}</p>
      )}

      <div className={styles.detailMeta}>
        <span className={styles.detailMetaKey}>Category</span>
        <span className={styles.detailMetaValue}>
          {CATEGORY_LABELS[asset.category]}
        </span>

        <span className={styles.detailMetaKey}>Tags</span>
        <span className={styles.detailMetaValue}>
          {asset.tags.length === 0
            ? "—"
            : asset.tags.map((t) => (
                <Badge key={t} variant="neutral">
                  {t}
                </Badge>
              ))}
        </span>

        <span className={styles.detailMetaKey}>Files</span>
        <span className={styles.detailMetaValue}>{asset.files.length}</span>

        <span className={styles.detailMetaKey}>Updated</span>
        <span className={styles.detailMetaValue}>
          {formatDate(asset.updated_at)}
        </span>
      </div>

      <div className={styles.detailVariants}>
        <div className={styles.detailVariantsHeading}>Variants</div>
        {asset.files.length === 0 ? (
          <span className={styles.variantMeta}>
            No file variants yet — upload one below.
          </span>
        ) : (
          asset.files.map((f) => (
            <VariantRow
              key={f.id}
              file={f}
              onDelete={() => handleVariantDelete(f.id)}
            />
          ))
        )}
      </div>

      <div className={styles.detailUploadSection}>
        <div className={styles.detailUploadHeading}>Add a variant</div>
        <VariantUpload assetId={asset.id} onUploaded={onSaved} />
      </div>

      {errorBanner && <div className={styles.formError}>{errorBanner}</div>}

      <div className={styles.detailActions}>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? "Deleting…" : "Delete asset"}
        </Button>
        <Button variant="secondary" onClick={() => setMode("edit")}>
          Edit metadata
        </Button>
      </div>
    </div>
  );
}

function VariantRow({
  file,
  onDelete,
}: {
  file: MarketingAssetFileRow;
  onDelete: () => void;
}) {
  const url = resolveFileUrl(file);
  const sourceLabel = sourceLabelFor(file);
  return (
    <div className={styles.variantRow}>
      <div className={styles.variantInfo}>
        <span className={styles.variantLabel}>
          {file.variant_label ?? file.mime_type}
          {file.is_primary && (
            <span className={styles.variantPrimaryBadge}>· primary</span>
          )}
        </span>
        <span className={styles.variantMeta}>
          {sourceLabel} · {formatFileSize(file.file_size_bytes)} · {file.mime_type}
        </span>
      </div>
      <div className={styles.variantRowActions}>
        {url && (
          <Button
            variant="secondary"
            size="sm"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {file.source_type === "drive_url" ? "Open in Drive" : "Download"}
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          aria-label="Delete variant"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

/* --- helpers --------------------------------------------------------- */

function resolveFileUrl(file: MarketingAssetFileRow): string | null {
  if (file.static_public_url) return file.static_public_url;
  if (file.external_url) return file.external_url;
  return null;
}

function sourceLabelFor(file: MarketingAssetFileRow): string {
  if (file.source_type === "drive_url") return "Google Drive";
  if (file.source_type === "storage") return "Supabase Storage";
  if (file.source_type === "static") return "Repo public/";
  return "Unknown";
}

function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

function formatMimeBadge(mime: string): string {
  if (mime === "application/pdf") return "PDF";
  if (mime === "application/postscript") return "EPS";
  if (mime.startsWith("video/")) return "VIDEO";
  if (mime === "text/markdown") return "MD";
  if (mime === "text/html") return "HTML";
  return mime.split("/").pop()?.toUpperCase() ?? "FILE";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
