import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
import { navLinks } from "@/lib/nav";

import styles from "./xq.module.css";

export function XqFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className={styles.page}>
      <SiteHeader links={navLinks} />
      {children}
      <Footer />
    </main>
  );
}
