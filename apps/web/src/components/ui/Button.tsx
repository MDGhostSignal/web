import Link from "next/link";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";

import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "pill" | "ghost";
type Size = "md" | "sm";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type AsLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children"> & {
    href: string;
    /** Force an anchor + target="_blank" instead of a Next <Link>. */
    external?: boolean;
  };

type AsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
    external?: undefined;
  };

export type ButtonProps = AsLink | AsButton;

function resolveClassName(variant: Variant, size: Size, override?: string) {
  return [styles.root, styles[variant], styles[size], override]
    .filter(Boolean)
    .join(" ");
}

/**
 * Shared button primitive. Renders as:
 *   - `<button>` if no `href` is passed
 *   - `<a>` if `href` is passed and starts with `http(s)://` (or `external` is true)
 *   - `<Link>` (Next.js internal route) otherwise
 *
 * Style is driven by `variant`: `primary` (default, dark uppercase pill
 * used on inner pages), `secondary` (inverted), `pill` (home-page hero
 * rounded white), or `ghost` (text-only).
 */
export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", className, children } = props;
  const finalClassName = resolveClassName(variant, size, className);

  if ("href" in props && props.href !== undefined) {
    const { href, external, variant: _v, size: _s, className: _c, children: _ch, ...rest } =
      props;
    void _v; void _s; void _c; void _ch;
    const isExternal = external ?? /^https?:\/\//i.test(href);

    if (isExternal) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={finalClassName}
          {...rest}
        >
          {children}
        </a>
      );
    }

    return (
      <Link href={href} className={finalClassName} {...rest}>
        {children}
      </Link>
    );
  }

  const { variant: _v, size: _s, className: _c, children: _ch, ...rest } = props;
  void _v; void _s; void _c; void _ch;
  return (
    <button className={finalClassName} {...rest}>
      {children}
    </button>
  );
}
