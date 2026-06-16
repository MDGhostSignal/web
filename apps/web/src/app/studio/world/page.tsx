import { redirect } from "next/navigation";

import {
  createStudioServerClient,
  loadCurrentStudioMember,
} from "@/lib/studio-auth";
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

  return (
    <div className={styles.page}>
      <StudioHeader activeTab="world" />
      <div className={styles.gameArea}>
        <WorldClient
          windowed
          identity={{
            token,
            displayName,
            archetype: member.xqArchetype ?? undefined,
          }}
        />
      </div>
    </div>
  );
}
