import { notFound } from "next/navigation";

/** Per-request; never statically prerendered. */
export const dynamic = "force-dynamic";

import { supabaseRest } from "@/lib/supabase-admin";
import { loadStudioRqSummary, loadStudioXqSummary } from "@/lib/studio-data";

import { StudioHeader } from "../StudioHeader";
import { ResultTiles } from "../ResultTiles";

import styles from "../studio.module.css";

/**
 * /studio/results-preview — DEV-ONLY preview of the member-facing
 * /studio/results page, so the team can see the XQ + RQ reveal without a
 * member login. Picks a real member who has both quizzes filled out and
 * renders the exact same cards + loaders the real page uses. 404s in
 * production; the proxy exempts it from the studio auth gate. Not for
 * commit — a temporary inspection aid.
 */
export default async function ResultsPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const res = await supabaseRest<
    Array<{
      id: string;
      first_name: string | null;
      organization: string | null;
      xq_submission_id: string | null;
      rq_submission_id: string | null;
      xq_archetype: string | null;
      rq_code: string | null;
    }>
  >(
    "members?select=id,first_name,organization,xq_submission_id,rq_submission_id,xq_archetype,rq_code" +
      "&xq_submission_id=not.is.null&rq_submission_id=not.is.null&limit=1",
  );
  const m = res.ok ? res.data[0] : null;

  if (!m) {
    return (
      <main className={styles.dashMain}>
        <h1 className={styles.dashWelcome}>Results preview</h1>
        <p className={styles.dashSubtitle}>
          No member with both XQ and RQ filled out was found to preview.
        </p>
      </main>
    );
  }

  const [xqSummary, rqSummary] = await Promise.all([
    loadStudioXqSummary(m.xq_submission_id),
    loadStudioRqSummary(m.rq_submission_id),
  ]);

  const who = m.organization ?? m.first_name ?? "member";

  return (
    <>
      <StudioHeader
        activeTab="results"
        profile={{
          initial: (m.first_name?.trim().charAt(0) || "?").toUpperCase(),
          imageUrl: null,
          attention: false,
        }}
      />
      <main className={styles.dashMain}>
        <p
          style={{
            display: "inline-block",
            marginBottom: 12,
            padding: "6px 12px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            color: "#b26a00",
            background: "rgba(255, 176, 32, 0.14)",
            border: "1px solid rgba(255, 176, 32, 0.4)",
          }}
        >
          Dev preview — showing {who}&apos;s results (exactly what that
          member sees at /studio/results)
        </p>
        <h1 className={styles.dashWelcome}>Your results</h1>
        <p className={styles.dashSubtitle}>
          Your XQ Conviction and RQ Resonance profiles — the same reveal you
          saw right after each quiz. Come back any time.
        </p>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Your conviction profile</h3>
          <ResultTiles
            xqSummary={xqSummary}
            rqSummary={rqSummary}
            xqFallback={m.xq_archetype}
            rqFallback={m.rq_code}
          />
        </section>
      </main>
    </>
  );
}
