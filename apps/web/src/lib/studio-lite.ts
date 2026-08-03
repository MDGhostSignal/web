/**
 * Studio Lite switch.
 *
 * While true, the legacy studio surfaces (dashboard with show stats +
 * XQ/RQ cards, the marketplace X-Deck, the multiplayer world, and the
 * original marketing landing) are unrouted on the live site: their
 * pages redirect into the lite surface and their header tabs are
 * hidden. All legacy code stays in the repo untouched — flip this to
 * false to restore the full studio exactly as it was.
 */
export const STUDIO_LITE_ONLY = true;

/**
 * Roster pause switch (2026-08-03).
 *
 * While true, the Roster tab is hidden from the studio header and
 * /studio/roster redirects to /studio/profile, which becomes the
 * signed-in home. Nothing is deleted — flip to false to bring the
 * roster back exactly as it was.
 */
export const STUDIO_ROSTER_HIDDEN = true;
