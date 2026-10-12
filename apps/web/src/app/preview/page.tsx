import Link from "next/link";

import { Container, Section } from "@/components/layout";

import styles from "./page.module.css";

const PAGES = [
  {
    href: "/preview/what-is-this",
    label: "What Is This",
  },
  {
    href: "/preview/advertisers-hero",
    label: "For Advertisers hero",
  },
  {
    href: "/preview/creators-hero",
    label: "For Creators hero",
  },
];

export default function PreviewIndexPage() {
  return (
    <Section className={styles.section}>
      <Container>
        <h1 className={styles.title}>Preview. Not the live site.</h1>
        <ul className={styles.list}>
          {PAGES.map((page) => (
            <li key={page.href}>
              <Link href={page.href}>{page.label}</Link>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
