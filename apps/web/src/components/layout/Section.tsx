import { forwardRef, type ComponentPropsWithoutRef } from "react";

type SectionProps = ComponentPropsWithoutRef<"section">;

/**
 * Semantic section primitive — the "band" of the page.
 *
 * Renders a plain `<section>` with the supplied className. Pairs with
 * <Container> for the inner width-constrained content well. The naming
 * convention this primitive enforces:
 *
 *   <Section className={styles.heroSection}>   // band
 *     <Container className={styles.hero}>      // width-constrained well
 *       …
 *     </Container>
 *   </Section>
 *
 * Use page-specific CSS module classes via `className` to apply the
 * band's background, padding, clip-path, etc. forwardRef lets parents
 * attach scroll triggers / IntersectionObservers without unwrapping.
 */
export const Section = forwardRef<HTMLElement, SectionProps>(function Section(
  { className, children, ...rest },
  ref,
) {
  return (
    <section ref={ref} className={className} {...rest}>
      {children}
    </section>
  );
});
