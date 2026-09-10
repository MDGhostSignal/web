import { InvitationShell } from "../InvitationShell";
import { INVITATION_FOUNDERS } from "../invitationShared";

/**
 * /invitation/creators — twin of /invitation. Same shell and styling;
 * only the three benefit cards and the pull-quote differ.
 */

export const metadata = {
  title: "You're invited — GHOSTSignal for creators",
  description:
    "GHOSTSignal is a podcast network that pairs brands with shows whose audiences already share their values. This is your invitation to the GHOSTSignal ecosystem.",
};

/** Creator-specific benefits — only content that differs from /invitation. */
const FEATURES = [
  {
    title: "Creative Freedom",
    description:
      "Be freed up to create! GHOSTSignal handles matching tech, contracts, podcast hosting, campaigns, and reporting — giving you network-wide resonance and reach without the hassle of individual deals.",
  },
  {
    title: "Values-Aligned Partnerships",
    description:
      "We understand that your voice, and the trust relationship with your listening community is everything. We connect you with brands you can be proud of. Nobel laureate economist Daron Acemoglu demonstrates that value alignment builds trust — allowing you to generate meaningful revenue while protecting and deepening the connection you have built with your audience.",
  },
  {
    title: "World-Making Membership",
    description:
      "Join a community of values-aware creators and brands who understand they are making the world through their work.",
  },
] as const;

export default function CreatorInvitationPage() {
  return (
    <InvitationShell
      features={FEATURES}
      quote="Advertising that builds trust with your audience"
      founders={INVITATION_FOUNDERS}
    />
  );
}
