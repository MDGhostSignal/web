import type { InvitationFounder } from "./InvitationShell";

/** Shared co-founder bios for both invitation audiences. */
export const INVITATION_FOUNDERS = [
  {
    name: "Mike Sense",
    role: "Vision & Partnerships",
    location: "Prague, Czechia",
    linkedin: "https://www.linkedin.com/in/mike-sense/",
    bio: "Mike is good at two questions — what is a person, and what is shaping the future — and GHOSTSignal is his mission, not just a company with friends.",
    image: "/images/who-are-we/mike6.jpg",
  },
  {
    name: "Jack W Harding",
    role: "Cultural & Business Strategist",
    location: "Cambridge, UK",
    linkedin: "https://www.linkedin.com/in/jackwharding",
    bio: "Jack is guided by the belief that the world is made in the right direction when good creators, good brands, and good audiences find each other. With a background in business strategy, research, and podcasting, Jack looks forward to hearing your story if anything here resonates!",
    image: "/images/who-are-we/jack11.jpg",
  },
  {
    name: "Martin Drexler",
    role: "Design",
    location: "Munich, Germany",
    linkedin: "https://www.linkedin.com/in/whoismartindrexler/",
    bio: "Martin is an award-winning German designer who blends creativity, strategy, and measurable impact at the frontier of creator–brand partnership.",
    image: "/images/who-are-we/martin3.jpg",
  },
  {
    name: "Jeremy Reeves",
    role: "Creative Strategist",
    location: "Colorado Springs, CO",
    linkedin: "https://www.linkedin.com/in/jeremy-reeves-5365b036a/",
    bio: "Jeremy is driven by the moment a person sees something new — an insight, a possibility, a truer version of themselves.",
    image: "/images/who-are-we/jeremy4.jpg",
  },
] as const satisfies readonly InvitationFounder[];
