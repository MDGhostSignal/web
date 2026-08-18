import { findMembersByEmail } from "@/lib/members";
import { supabaseRest } from "@/lib/supabase-admin";

/**
 * Best-effort link of a scored RQ submission back to a matching Member
 * row by email — the RQ mirror of the XQ route's linkSubmissionToMember.
 * Sets `members.rq_submission_id` (+ the denormalized rq_code) only
 * when there's exactly one email match; ambiguous cases are skipped to
 * avoid mis-linking PII. Without this, a Studio member who takes the
 * RQ after signing up keeps seeing the "fill out your RQ" prompt even
 * though their result exists.
 *
 * Shared by both completion paths: the direct complete POST and the
 * incomplete→complete PATCH upgrade (the common path — the RQ quiz
 * captures a lead at the contact step, then PATCHes the same row on
 * final submission).
 */
export type LinkOutcome = {
  status: "linked" | "no_match" | "ambiguous" | "skipped";
  candidateCount: number;
};

export async function linkRqSubmissionToMember(
  submissionId: string,
  email: string | null | undefined,
  rqCode: string | null | undefined,
): Promise<LinkOutcome> {
  if (!submissionId || !email || !email.includes("@")) {
    return { status: "skipped", candidateCount: 0 };
  }
  try {
    const matches = await findMembersByEmail(email);
    // Exactly one match is safe to auto-link. 0 or >1 are no longer
    // silently dropped — the caller surfaces them (console + a banner on
    // the admin notification email) so the result gets linked by hand.
    if (matches.length === 0) return { status: "no_match", candidateCount: 0 };
    if (matches.length > 1) {
      return { status: "ambiguous", candidateCount: matches.length };
    }
    const patch: Record<string, unknown> = { rq_submission_id: submissionId };
    if (rqCode) patch.rq_code = rqCode;
    await supabaseRest(`members?id=eq.${encodeURIComponent(matches[0].id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
      prefer: "return=minimal",
    });
    return { status: "linked", candidateCount: 1 };
  } catch (err) {
    console.warn("RQ → member link skipped:", err);
    return { status: "skipped", candidateCount: 0 };
  }
}
