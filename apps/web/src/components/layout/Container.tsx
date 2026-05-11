import { forwardRef, type ComponentPropsWithoutRef } from "react";

import styles from "./Container.module.css";

type ContainerProps = ComponentPropsWithoutRef<"div">;

/**
 * Content-well primitive — the inner width-constrained block that
 * sits inside a <Section>.
 *
 * Always applies `max-width: var(--content-max); margin-inline: auto`
 * via its own CSS module. Page-specific layout (grid columns, gap,
 * flex direction, position context) is composed via the className the
 * consumer passes. Stops every page from redeclaring those two lines.
 *
 *   <Container className={styles.features}>
 *     …
 *   </Container>
 */
export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  function Container({ className, children, ...rest }, ref) {
    const merged = className ? `${styles.container} ${className}` : styles.container;
    return (
      <div ref={ref} className={merged} {...rest}>
        {children}
      </div>
    );
  },
);
