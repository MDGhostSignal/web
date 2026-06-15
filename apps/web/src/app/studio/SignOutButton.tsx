"use client";

import { useRouter } from "next/navigation";

import { createStudioBrowserClient } from "@/lib/studio-auth";

import styles from "./studio.module.css";

/** Top-right sign-out button on the Studio dashboard header. */
export function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    const supabase = createStudioBrowserClient();
    await supabase.auth.signOut();
    router.replace("/studio/login");
    router.refresh();
  }
  return (
    <button type="button" className={styles.dashSignOut} onClick={signOut}>
      Sign out
    </button>
  );
}
