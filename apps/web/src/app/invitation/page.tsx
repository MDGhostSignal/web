import { InvitationShell } from "./InvitationShell";
import { INVITATION_FOUNDERS } from "./invitationShared";

/**
 * /invitation — the full-page version of the cold-outreach email
 * (lib/cold-outreach-email.ts). Structure lives in InvitationShell;
 * this file only supplies brand audience copy (features + quote).
 */

export const metadata = {
  title: "You're invited — the GHOSTSignal ecosystem",
  description:
    "GHOSTSignal is a podcast network that pairs brands with shows whose audiences already share their values. This is your invitation to the GHOSTSignal ecosystem.",
};

/** The email's pitch, given room — value props from /for-advertisers. */
const FEATURES = [
  {
    title: "Podcast Ad Resonance",
    description:
      "Podcasting gives your brand an intimate voice, turning passive listeners into active participants. With host-read podcast ads driving 70% brand recall (double social banners), it is an effective, relational way to speak to an engaged audience.",
  },
  {
    title: "World-Making Membership",
    description:
      "Join a community of values-aware creators and brands who understand they are making the world through their work. GHOSTSignal handles matching tech, contracts, campaigns, and reporting — giving you network-wide resonance and reach without the hassle of individual deals.",
  },
  {
    title: "Values-Aligned Conversion",
    description:
      "We find a place for your brand among values-aligned communities you can be proud of. Nobel laureate economist Daron Acemoglu demonstrates that value alignment builds trust, and high-trust environments see superior economic value.",
  },
] as const;

export default function InvitationPage() {
  return (
    <InvitationShell
      features={FEATURES}
      quote="We help brands zoom in on the right people."
      founders={INVITATION_FOUNDERS}
    />
  );
}
