"use client";

import { useState } from "react";

import { Badge, type BadgeVariant, Button } from "@/components/admin";
import { copyText } from "@/lib/clipboard";
import {
  KIND_LABELS,
  PERSONA_LABELS,
} from "@/lib/copy-snippets-types";
import type { CopySnippetRow } from "@/lib/copy-snippets-types";

import styles from "../../marketing.module.css";

type Props = {
  snippet: CopySnippetRow;
  onEdit: () => void;
  onToggleFavorite: () => void;
};

const COPIED_FLASH_MS = 1500;

/**
 * Single snippet card. Renders the text big and copy-able, with
 * kind/persona badges + tag chips + a Copy button that lands the text
 * on the clipboard and briefly flashes "Copied!".
 *
 * Click anywhere on the card body opens the edit modal; the Copy +
 * Favorite + Edit buttons stop propagation so they don't double-trigger.
 */
export function SnippetCard({ snippet, onEdit, onToggleFavorite }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(): Promise<void> {
    const ok = await copyText(snippet.text);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), COPIED_FLASH_MS);
    }
  }

  return (
    <article
      className={[
        styles.snippetCard,
        snippet.favorite ? styles.snippetCardFavorite : "",
      ].join(" ")}
    >
      <button
        type="button"
        className={styles.snippetBody}
        onClick={onEdit}
        aria-label="Edit snippet"
      >
        <p className={styles.snippetText}>{snippet.text}</p>
      </button>

      <div className={styles.snippetMeta}>
        <Badge variant={kindBadge(snippet.kind)}>
          {KIND_LABELS[snippet.kind]}
        </Badge>
        <Badge variant={personaBadge(snippet.persona)}>
          {PERSONA_LABELS[snippet.persona]}
        </Badge>
        {snippet.tags.slice(0, 3).map((t) => (
          <Badge key={t} variant="neutral">
            {t}
          </Badge>
        ))}
        {snippet.tags.length > 3 && (
          <span className={styles.snippetTagOverflow}>
            +{snippet.tags.length - 3}
          </span>
        )}
      </div>

      <div className={styles.snippetActions}>
        <button
          type="button"
          className={styles.snippetFavBtn}
          onClick={onToggleFavorite}
          aria-label={snippet.favorite ? "Unfavorite" : "Favorite"}
          title={snippet.favorite ? "Remove from favorites" : "Favorite"}
        >
          {snippet.favorite ? "★" : "☆"}
        </button>
        <Button
          variant={copied ? "primary" : "secondary"}
          size="sm"
          onClick={handleCopy}
        >
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
    </article>
  );
}

function kindBadge(kind: CopySnippetRow["kind"]): BadgeVariant {
  switch (kind) {
    case "tagline":
      return "accent";
    case "headline":
      return "info";
    case "subhead":
      return "info";
    case "value_prop":
      return "success";
    case "cta":
      return "warn";
    case "social_hook":
      return "creator";
    case "long_form":
      return "neutral";
    case "glossary":
      return "brand";
  }
}

function personaBadge(persona: CopySnippetRow["persona"]): BadgeVariant {
  if (persona === "creators") return "creator";
  if (persona === "advertisers") return "brand";
  return "neutral";
}
