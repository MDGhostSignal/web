"use client";

import { useEffect, type ReactNode } from "react";

import styles from "./Modal.module.css";

type Size = "sm" | "md" | "lg" | "xl";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Shown in the header. Omit to render a custom body-only card. */
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Footer content — usually Cancel + Confirm buttons. Omit to hide
      the footer border + spacing entirely. */
  footer?: ReactNode;
  size?: Size;
  /** If true (default), pressing Escape or clicking the overlay closes
      the modal. Set to false while a request is in flight. */
  dismissible?: boolean;
  children: ReactNode;
  /** Accessibility label for the close button. */
  closeLabel?: string;
  /** Pass a heading ID for aria-labelledby if you're providing a custom
      title layout. Defaults to an internally-generated id. */
  titleId?: string;
  /** Optional className appended to the card so a caller can widen
      the modal beyond the predefined sizes (e.g. "+ max-width: 1200px"
      for content-heavy explainer modals). */
  className?: string;
};

const sizeClass: Record<Size, string> = {
  sm: styles.sizeSm,
  md: "",
  lg: styles.sizeLg,
  xl: styles.sizeXl,
};

/**
 * Admin modal primitive. Overlay with backdrop blur, centred card,
 * optional title / subtitle / footer slots. Escape + overlay-click
 * dismissal is opt-out via `dismissible={false}` for in-flight states.
 *
 * The component does NOT portal — place modals inside `.admin-root` or
 * another token-scope so CSS variables resolve. Consumers wrap the
 * entire render in `{open && <Modal ... />}` conditionally.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  footer,
  size = "md",
  dismissible = true,
  children,
  closeLabel = "Close dialog",
  titleId = "admin-modal-title",
  className,
}: Props) {
  // Escape key handler — effects only attach while open.
  useEffect(() => {
    if (!open || !dismissible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismissible, onClose]);

  // Scroll-lock the page while modal is open so the background doesn't
  // scroll behind it.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const cardCls = [styles.card, sizeClass[size], className]
    .filter(Boolean)
    .join(" ");
  const bodyCls = [styles.body, footer ? "" : styles.bodyNoFooter]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={styles.overlay}
      onClick={() => {
        if (dismissible) onClose();
      }}
      role="presentation"
    >
      <div
        className={cardCls}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
      >
        {(title || subtitle) && (
          <div className={styles.header}>
            <div className={styles.titleGroup}>
              {title && (
                <h2 id={titleId} className={styles.title}>
                  {title}
                </h2>
              )}
              {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
            {dismissible && (
              <button
                type="button"
                className={styles.closeBtn}
                onClick={onClose}
                aria-label={closeLabel}
              >
                <svg
                  viewBox="0 0 16 16"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="3" y1="3" x2="13" y2="13" />
                  <line x1="13" y1="3" x2="3" y2="13" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className={bodyCls}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}
