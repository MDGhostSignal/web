import { PageHeader, Badge } from "@/components/admin";
import { supabaseRest } from "@/lib/supabase-admin";

import { MembersTable } from "./MembersTable";
import styles from "./page.module.css";

/** Admin page reading live Supabase state; no useful static output. */
export const dynamic = "force-dynamic";

/**
 * Studio Members — everyone who has successfully joined the Studio
 * (registered AND activated). Shows when they joined, which side of
 * the network they're on, and their XQ/RQ completion at a glance;
 * clicking a row opens the full dossier (contact + org card + both
 * quiz results) via GET /api/admin/studio/members/[id].
 */
export default async function StudioMembersPage() {
  const res = await supabaseRest<StudioMemberRow[]>(
    "members?select=id,email,first_name,last_name,organization,member_type,created_at,activated_at,xq_submission_id,xq_archetype,rq_submission_id,rq_code&" +
      "auth_user_id=not.is.null&" +
      "activated_at=not.is.null&" +
      "order=activated_at.desc",
  );

  const members = res.ok ? res.data ?? [] : [];
  const fetchError = res.ok
    ? null
    : `Load failed (${res.status}): ${res.detail.slice(0, 200)}`;
  const bothDone = members.filter(
    (m) => m.xq_submission_id && m.rq_submission_id,
  ).length;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Studio Members"
        subtitle="Everyone with an active Studio account. Click a row for the full picture — contact, card, and their XQ/RQ results."
        count={
          <>
            <Badge variant="accent">{members.length} joined</Badge>{" "}
            <Badge variant={bothDone === members.length && members.length > 0 ? "success" : "neutral"}>
              {bothDone} with XQ+RQ
            </Badge>
          </>
        }
      />

      {fetchError && <div className={styles.error}>{fetchError}</div>}

      {members.length === 0 && !fetchError ? (
        <div className={styles.empty}>
          <strong>No members yet.</strong>
          <p>As people sign up and confirm their email, they appear here.</p>
        </div>
      ) : (
        <MembersTable rows={members} />
      )}
    </div>
  );
}

export type StudioMemberRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  organization: string | null;
  member_type: "brand" | "creator" | "other";
  created_at: string | null;
  activated_at: string | null;
  xq_submission_id: string | null;
  xq_archetype: string | null;
  rq_submission_id: string | null;
  rq_code: string | null;
};
