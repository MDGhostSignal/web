import { PageHeader, Badge } from "@/components/admin";
import { supabaseRest } from "@/lib/supabase-admin";

import { ApprovalsTable } from "./ApprovalsTable";
import styles from "./page.module.css";

/** Admin page reading live Supabase state; no useful static output. */
export const dynamic = "force-dynamic";

/** Pending Studio registrations. Members with auth_user_id set
 *  (= they registered) but activated_at NULL (= no co-founder has
 *  approved yet). One Approve button per row → flips activated_at. */
export default async function StudioApprovalsPage() {
  const res = await supabaseRest<PendingRow[]>(
    "members?select=id,email,first_name,last_name,organization,member_type,xq_archetype,rq_code,created_at,auth_user_id&" +
      "auth_user_id=not.is.null&" +
      "activated_at=is.null&" +
      "order=created_at.desc",
  );

  const pending = res.ok ? res.data ?? [] : [];
  const fetchError = res.ok ? null : `Load failed (${res.status}): ${res.detail.slice(0, 200)}`;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Studio Approvals"
        subtitle="Pending Studio registrations. Approve to grant access to the dashboard + marketplace."
        count={
          <Badge variant={pending.length > 0 ? "warn" : "neutral"}>
            {pending.length} pending
          </Badge>
        }
      />

      {fetchError && <div className={styles.error}>{fetchError}</div>}

      {pending.length === 0 ? (
        <div className={styles.empty}>
          <strong>All caught up.</strong>
          <p>No registrations waiting for approval right now. New sign-ups will appear here.</p>
        </div>
      ) : (
        <ApprovalsTable rows={pending} />
      )}
    </div>
  );
}

export type PendingRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  organization: string | null;
  member_type: "creator" | "brand" | "other";
  xq_archetype: string | null;
  rq_code: string | null;
  created_at: string;
  auth_user_id: string | null;
};
