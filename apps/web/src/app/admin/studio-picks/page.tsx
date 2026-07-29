import { PageHeader, Badge } from "@/components/admin";
import { supabaseRest } from "@/lib/supabase-admin";

import { PicksManager } from "./PicksManager";
import styles from "./page.module.css";

/** Admin page reading live Supabase state; no useful static output. */
export const dynamic = "force-dynamic";

/**
 * GhostSignal Picks — the team hand-curates which brands lead each
 * member's Studio roster deck ("✦ GhostSignal Pick" badge). This page
 * is the editorial desk: pick a member, arrange up to 4 brands, save.
 *
 * Tolerant of the migration not having run yet
 * (docs/STUDIO_LITE_RECOMMENDATIONS.sql): members + brands still load,
 * the picks column shows a run-the-migration notice, and saving is
 * blocked server-side with the same message.
 */
export default async function StudioPicksPage() {
  const [membersRes, brandsRes, picksRes] = await Promise.all([
    supabaseRest<MemberRow[]>(
      "members?select=id,email,first_name,last_name,organization,member_type&" +
        "auth_user_id=not.is.null&" +
        "activated_at=not.is.null&" +
        "order=first_name.asc",
    ),
    supabaseRest<BrandRow[]>("brands?select=id,name&order=name.asc"),
    supabaseRest<PickRow[]>(
      "studio_brand_recommendations?select=member_id,brand_id,position,note&order=position.asc",
    ),
  ]);

  const members = membersRes.ok ? membersRes.data ?? [] : [];
  const brands = brandsRes.ok ? brandsRes.data ?? [] : [];
  // A failed picks read almost always means the table doesn't exist
  // yet (migration pending) — degrade to an empty pick set + notice.
  const picksTableMissing = !picksRes.ok;
  const picks = picksRes.ok ? picksRes.data ?? [] : [];

  const fetchError = !membersRes.ok
    ? `Members load failed (${membersRes.status}): ${membersRes.detail.slice(0, 200)}`
    : !brandsRes.ok
      ? `Brands load failed (${brandsRes.status}): ${brandsRes.detail.slice(0, 200)}`
      : null;

  return (
    <div className={styles.page}>
      <PageHeader
        title="GhostSignal Picks"
        subtitle="Hand-picked brands that lead a member's Studio roster deck, badged as team picks. Order is deck order; convention is 4 per member."
        count={
          <Badge variant={picks.length > 0 ? "accent" : "neutral"}>
            {picks.length} pick{picks.length === 1 ? "" : "s"} set
          </Badge>
        }
      />

      {picksTableMissing && (
        <div className={styles.notice}>
          <strong>Migration pending.</strong> The picks table doesn&apos;t
          exist yet — run <code>docs/STUDIO_LITE_RECOMMENDATIONS.sql</code> in
          the Supabase SQL editor, then reload. Members and brands below are
          live; saving is disabled until then.
        </div>
      )}
      {fetchError && <div className={styles.error}>{fetchError}</div>}

      {members.length === 0 && !fetchError ? (
        <div className={styles.empty}>
          <strong>No approved members yet.</strong>
          <p>
            Picks attach to approved Studio members. Approve registrations
            first, then curate their decks here.
          </p>
        </div>
      ) : (
        <PicksManager
          members={members}
          brands={brands}
          picks={picks}
          saveDisabled={picksTableMissing}
        />
      )}
    </div>
  );
}

export type MemberRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  organization: string | null;
  member_type: "creator" | "brand" | "other";
};

export type BrandRow = {
  id: string;
  name: string;
};

export type PickRow = {
  member_id: string;
  brand_id: string;
  position: number | null;
  note: string | null;
};
