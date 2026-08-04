import Link from "next/link";

import type { StudioMember } from "@/lib/studio-auth";
import type { StudioOrgProfile } from "@/lib/studio-data";

import styles from "./studio.module.css";

/**
 * Per-sign-in nudges shown at the top of every lite studio page.
 * Recomputed on each request, so the notices appear every visit
 * until the underlying gap is closed (XQ taken, RQ taken, profile
 * completed). Deliberately not dismissible. The org row comes from
 * the page (which already loads it for the header avatar) so it's
 * fetched once per request.
 */
export function StudioNotices({
  member,
  org,
}: {
  member: StudioMember;
  org: StudioOrgProfile | null;
}) {

  const notices: Array<{
    key: string;
    title: string;
    body: string;
    href: string;
    cta: string;
  }> = [];

  if (!member.xqSubmissionId) {
    notices.push({
      key: "xq",
      title: "Take your XQ",
      body: "Your Values Blueprint is how the network reads you — matching starts here.",
      href: "/xq-quiz",
      cta: "Start the XQ",
    });
  }
  if (!member.rqSubmissionId) {
    notices.push({
      key: "rq",
      title: "Take your RQ",
      body: "The Resonance Quotient turns your blueprint into partner matches. Members only.",
      href: "/rq-quiz",
      cta: "Start the RQ",
    });
  }
  if (org && (!org.description || !org.imageUrl)) {
    notices.push({
      key: "profile",
      title: "Finish your profile",
      body: org.imageUrl
        ? "Add a description so partners know who you are."
        : "Add your image and description so partners know who you are.",
      href: "/studio/profile",
      cta: "Complete profile",
    });
  }

  if (notices.length === 0) return null;

  return (
    <div className={styles.noticeStack}>
      {notices.map((n) => (
        <div key={n.key} className={styles.notice}>
          <span className={styles.noticeDot} aria-hidden="true" />
          <div className={styles.noticeBody}>
            <span className={styles.noticeTitle}>{n.title}</span>
            <span className={styles.noticeText}>{n.body}</span>
          </div>
          <Link href={n.href} className={styles.noticeCta}>
            {n.cta} →
          </Link>
        </div>
      ))}
    </div>
  );
}
