import { redirect } from "next/navigation";

import {
  createStudioServerClient,
  loadCurrentStudioMember,
} from "@/lib/studio-auth";
import { loadStudioXqSummary } from "@/lib/studio-data";
import WorldClient from "@/app/world/WorldClient";

import styles from "./world.module.css";
import { StudioHeader } from "../StudioHeader";

/** Studio /world — authed entry into the multiplayer RPG.
 *
 * Passes the signed-in member's display name, XQ archetype, and
 * Supabase access token into the existing WorldClient. The Colyseus
 * server validates the token in WorldRoom.onAuth, looks up the
 * matching members row, and broadcasts the player with their real
 * name + archetype. Other players in the world see them by name and
 * can press E to view their RQ/XQ summary card.
 *
 * The public /world route still works without auth — guests join with
 * a random Guest-XXXX name and a default archetype.
 */
export const dynamic = "force-dynamic";

export default async function StudioWorldPage() {
  const member = await loadCurrentStudioMember();
  if (!member) redirect("/studio/login");
  if (!member.isApproved) redirect("/studio/pending");

  // Read the access_token from the cookie-bound Supabase session so we
  // can hand it to the game server. Without a session there's no token
  // to send — but the auth-gate above guarantees we have one here.
  const supabase = await createStudioServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token ?? undefined;

  const firstName = member.firstName?.trim() ?? "";
  const lastName = member.lastName?.trim() ?? "";
  const displayName =
    `${firstName} ${lastName}`.trim() || member.displayName;

  // `members.xq_archetype` is a denormalization that doesn't always
  // get written when the XQ quiz is submitted, so the column is often
  // null even for users who have a valid xq_submissions row. Read-
  // time fallback: pull the code from the linked submission. Without
  // this the world picks a random archetype and the user's character
  // looks wrong despite their identity being correct.
  let archetype = member.xqArchetype ?? null;
  if (!archetype && member.xqSubmissionId) {
    const xq = await loadStudioXqSummary(member.xqSubmissionId);
    archetype = xq?.code ?? null;
  }

  return (
    <div className={styles.page}>
      <StudioHeader activeTab="world" />
      <div className={styles.gameArea}>
        <WorldClient
          windowed
          identity={{
            token,
            displayName,
            archetype: archetype ?? undefined,
          }}
        />
      </div>
    </div>
  );
}
