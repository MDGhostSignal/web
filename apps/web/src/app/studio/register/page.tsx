import { redirect } from "next/navigation";

import { verifyStudioInvite } from "@/lib/studio-invite";
import { STUDIO_INVITE_ONLY } from "@/lib/studio-lite";

import { RegisterForm } from "./RegisterForm";

/**
 * /studio/register — server gate in front of the registration form.
 *
 * While STUDIO_INVITE_ONLY is on, the page only opens for a valid
 * `?invite=<token>` link from the team's invite email (signed payload,
 * see lib/studio-invite.ts) — everyone else is bounced to login. The
 * decoded invite prefills the form and locks email + member type.
 * proxy.ts mirrors this: it only lets /studio/register through
 * unauthenticated when an ?invite= param is present at all; the real
 * verification happens here, server-side.
 *
 * With the flag off this renders the classic open self-serve form.
 */
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite: token } = await searchParams;

  if (!STUDIO_INVITE_ONLY) {
    return <RegisterForm invite={null} inviteToken={null} />;
  }

  const invite = token ? verifyStudioInvite(token) : null;
  if (!invite || !token) {
    redirect("/studio/login");
  }

  return (
    <RegisterForm
      invite={{
        email: invite.email,
        firstName: invite.firstName,
        lastName: invite.lastName,
        kind: invite.kind,
        orgName: invite.orgName,
      }}
      inviteToken={token}
    />
  );
}
