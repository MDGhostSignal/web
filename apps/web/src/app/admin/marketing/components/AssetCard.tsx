"use client";

import { Badge } from "@/components/admin";
import type { MarketingAssetRow } from "@/lib/marketing-assets-types";

import styles from "../marketing.module.css";

export type CardPreview = { url: string; mime: string };

type Props = {
  asset: MarketingAssetRow;
  /** Resolved preview for the primary variant, if any. */
  preview?: CardPreview | null;
  /** Variant count, surfaced by the list endpoint. */
  variantCount?: number;
  onClick: () => void;
};

const MAX_VISIBLE_TAGS = 3;

/**
 * Grid card for a single asset.
 *
 * Preview kind is chosen by the primary file's MIME:
 *  - image/*    → <img>
 *  - video/*    → <video preload="metadata"> (browsers render the
 *                 first frame as the implicit poster — no extra
 *                 thumbnail generation needed)
 *  - application/pdf, text/markdown, application/postscript, etc.
 *                → styled mime-label tile (e.g. "PDF" big, in the
 *                  card's empty preview area)
 *
 * Click anywhere on the card → parent opens the detail modal.
 */
export function AssetCard({ asset, preview, variantCount, onClick }: Props) {
  const visibleTags = asset.tags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenCount = Math.max(0, asset.tags.length - visibleTags.length);

  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <div className={styles.cardThumb}>
        <PreviewBody preview={preview} category={asset.category} />
      </div>

      <div className={styles.cardBody}>
        <div className={styles.cardTitleRow}>
          <div className={styles.cardTitle}>{asset.title}</div>
          {typeof variantCount === "number" && variantCount > 0 && (
            <span className={styles.cardMeta}>
              {variantCount} {variantCount === 1 ? "file" : "files"}
            </span>
          )}
        </div>

        {asset.tags.length > 0 && (
          <div className={styles.cardTags}>
            {visibleTags.map((t) => (
              <Badge key={t} variant="neutral">
                {t}
              </Badge>
            ))}
            {hiddenCount > 0 && (
              <span className={styles.cardTagOverflow}>+{hiddenCount}</span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

function PreviewBody({
  preview,
  category,
}: {
  preview: CardPreview | null | undefined;
  category: MarketingAssetRow["category"];
}): React.ReactElement {
  if (!preview) {
    return (
      <span className={styles.cardThumbIcon} aria-hidden="true">
        {fallbackGlyph(category)}
      </span>
    );
  }

  const { url, mime } = preview;

  if (mime.startsWith("image/")) {
    return (
      // Admin thumbnails draw from mixed sources (static public URLs,
      // Supabase Storage public URLs, Drive thumbnail links).
      // next/image's loader doesn't help here and breaks remote
      // thumbnail URLs we don't control.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" />
    );
  }

  if (mime.startsWith("video/")) {
    return (
      <video
        className={styles.cardVideo}
        src={url}
        muted
        playsInline
        preload="metadata"
      />
    );
  }

  if (mime === "application/pdf") {
    // Browsers' built-in PDF viewers render the first page inline.
    // pointer-events: none on the <object> keeps the parent <button>'s
    // click handler intact (otherwise the PDF viewer swallows clicks).
    // The hash params nudge Chromium to hide its toolbar / nav for a
    // cleaner thumbnail — other browsers ignore the hints harmlessly.
    return (
      <object
        className={styles.cardPdf}
        data={`${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
        type="application/pdf"
        aria-hidden="true"
      >
        <span className={styles.cardMimeBadge}>PDF</span>
      </object>
    );
  }

  // Everything else (MD, EPS, HTML, JSON, etc.): styled tile with the
  // file kind. Bigger and more informative than the bare category
  // letter, unmistakable from the image cards.
  return (
    <span className={styles.cardMimeBadge} aria-hidden="true">
      {mimeShortLabel(mime)}
    </span>
  );
}

function fallbackGlyph(category: MarketingAssetRow["category"]): string {
  switch (category) {
    case "brand":
      return "B";
    case "marketing":
      return "M";
    case "docs":
      return "D";
  }
}

function mimeShortLabel(mime: string): string {
  const m = mime.toLowerCase();
  if (m === "application/pdf") return "PDF";
  if (m === "application/postscript") return "EPS";
  if (m === "text/markdown") return "MD";
  if (m === "text/html") return "HTML";
  if (m === "application/json") return "JSON";
  if (m === "text/uri-list") return "LINK";
  return m.split("/").pop()?.toUpperCase() ?? "FILE";
}
