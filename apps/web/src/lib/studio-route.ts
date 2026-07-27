import "server-only";

import { NextResponse } from "next/server";

import { StudioAuthError } from "@/lib/studio-auth";

/**
 * Shared error → response mapping for /api/studio/* Route Handlers.
 *
 * Usage:
 *   try {
 *     const member = await requireApprovedMember();
 *     ...
 *     return NextResponse.json({ ok: true });
 *   } catch (e) {
 *     return studioError(e);
 *   }
 *
 * StudioAuthError surfaces its own message + status (401 unauthenticated,
 * 403 unapproved, 409 no linked row, 500 DB failure). Anything else is
 * masked as a generic 500 so internal error details never reach the
 * member-facing client.
 */
export function studioError(e: unknown) {
  if (e instanceof StudioAuthError) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: e.status },
    );
  }
  return NextResponse.json(
    { ok: false, error: "Server error." },
    { status: 500 },
  );
}
