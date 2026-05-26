"use client";

import { PageHeader } from "@/components/admin";

import styles from "./xq-responses.module.css";

/**
 * /admin/xq-responses — XQ submissions list.
 *
 * Placeholder for now. The XQ quiz is the free top-of-funnel half of
 * GhostSignal's XQ + RQ matching ecosystem (see
 * `memory/project_rq_xq_ecosystem.md`): XQ answers the internal
 * "what's my conviction substance?" question, RQ answers the external
 * "how do those convictions communicate in a partnership?" question.
 *
 * Plug-in plan when Jeremy's XQ scoring code lands:
 *
 *  1. Add an `xq_submissions` table to the schema (mirror
 *     `rq_submissions` shape — see the RQ migration in `docs/`).
 *  2. Land a scoring lib at `apps/web/src/lib/xq/scoring.ts` (mirrors
 *     `lib/rq/scoring.ts` — pure functions, no React).
 *  3. Add a public quiz route under `/xq-quiz` (mirrors `/rq-quiz`).
 *  4. Add `/api/xq-submissions` POST + list routes (mirror
 *     `/api/rq-submissions`).
 *  5. Replace this placeholder body with the parallel of
 *     `app/admin/rq-responses/page.tsx` — DataTable of submissions,
 *     status filter, detail modal with the XQ axis breakdown +
 *     graph component.
 *  6. Wire the marketplace lifecycle step `xq_completed` to
 *     auto-detect completion once `xq_submission_id` is set on the
 *     Member row (currently a manual checkbox — same future move
 *     planned for `rq_completed`).
 */
export default function XqResponsesPage() {
  return (
    <div className={styles.page}>
      <PageHeader
        title="XQ Responses"
        subtitle="The free top-of-funnel quiz — internal conviction-substance discovery."
      />

      <section className={styles.placeholderHero}>
        <h2 className={styles.placeholderTitle}>
          Waiting on the XQ scoring code from Jeremy
        </h2>
        <p className={styles.placeholderBody}>
          The XQ quiz is one half of GhostSignal&apos;s matching ecosystem
          (the other half is <strong>RQ</strong>, the premium
          marketplace-matching engine). Once the XQ scoring code is in,
          this page becomes a submissions table mirroring{" "}
          <code>/admin/rq-responses</code>: filters, status, detail
          modal, axis breakdown.
        </p>
        <p className={styles.placeholderBody}>
          Plug-in points (in <code>page.tsx</code> above):
        </p>
        <ol className={styles.placeholderList}>
          <li>
            Add an <code>xq_submissions</code> Supabase table (mirror
            <code> rq_submissions</code>).
          </li>
          <li>
            Land scoring at <code>apps/web/src/lib/xq/scoring.ts</code>.
          </li>
          <li>
            Public quiz route under <code>/xq-quiz</code>.
          </li>
          <li>
            <code>/api/xq-submissions</code> POST + list routes.
          </li>
          <li>
            Replace this placeholder with the parallel of the RQ admin
            page (DataTable + detail modal + graph).
          </li>
          <li>
            Wire the marketplace lifecycle step{" "}
            <code>xq_completed</code> to auto-detect completion when{" "}
            <code>xq_submission_id</code> is set on the Member row.
          </li>
        </ol>
      </section>
    </div>
  );
}
