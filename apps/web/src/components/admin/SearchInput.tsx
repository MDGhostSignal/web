import { forwardRef, type InputHTMLAttributes } from "react";

import styles from "./SearchInput.module.css";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Pass false to hide the magnifier icon (rare). */
  showIcon?: boolean;
  /** Extra class for the wrap div (e.g. to override max-width). */
  wrapClassName?: string;
};

/**
 * Admin search input. Inherits tokens for height, radius, border, and
 * focus ring. The wrap sits at max-width 500px by default to match the
 * prior RQ dashboard look; pass a custom `wrapClassName` to override.
 */
export const SearchInput = forwardRef<HTMLInputElement, Props>(
  function SearchInput(
    { showIcon = true, wrapClassName, className, ...inputProps },
    ref,
  ) {
    const wrapCls = [styles.wrap, wrapClassName].filter(Boolean).join(" ");
    const inputCls = [styles.input, className].filter(Boolean).join(" ");
    return (
      <div className={wrapCls}>
        {showIcon && (
          <svg
            className={styles.icon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        )}
        <input ref={ref} type="search" className={inputCls} {...inputProps} />
      </div>
    );
  },
);
