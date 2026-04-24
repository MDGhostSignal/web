import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

import styles from "./Button.module.css";

type Variant =
  | "primary"
  | "secondary"
  | "destructive"
  | "destructiveSolid"
  | "ghost";
type Size = "sm" | "md" | "lg";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  className?: string;
  children?: ReactNode;
};

type ButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: never;
  };

type LinkProps = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & {
    href: string;
  };

export type Props = ButtonProps | LinkProps;

const variantClass: Record<Variant, string> = {
  primary: styles.variantPrimary,
  secondary: styles.variantSecondary,
  destructive: styles.variantDestructive,
  destructiveSolid: styles.variantDestructiveSolid,
  ghost: styles.variantGhost,
};

const sizeClass: Record<Size, string> = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
};

/**
 * Admin button primitive. Renders as a <button> by default, or as an
 * <a> when `href` is passed. Variants + sizes are token-driven so the
 * same shape is reused everywhere across the admin surfaces.
 */
export const Button = forwardRef<HTMLElement, Props>(function Button(
  {
    variant = "secondary",
    size = "md",
    leadingIcon,
    trailingIcon,
    className,
    children,
    ...rest
  },
  ref,
) {
  const cls = [styles.btn, variantClass[variant], sizeClass[size], className]
    .filter(Boolean)
    .join(" ");

  if ("href" in rest && rest.href !== undefined) {
    const { href, ...anchorRest } = rest as LinkProps;
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={cls}
        {...anchorRest}
      >
        {leadingIcon}
        {children}
        {trailingIcon}
      </a>
    );
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={(rest as ButtonProps).type ?? "button"}
      className={cls}
      {...(rest as ButtonProps)}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
});
