/**
 * Mock data for the /x-deck preview surface.
 *
 * The viewer is mocked as a brand founder with the X-S-L (Architect)
 * archetype — looking at potential creator matches from across the
 * other seven archetypes. Names, organizations, and bios are invented
 * for review; nothing here corresponds to real members yet.
 */

import type { MatchCandidate, ViewerProfile } from "./types";

export const MOCK_VIEWER: ViewerProfile = {
  name: "Marlene Voss",
  organization: "Northgate Capital",
  memberType: "brand",
  archetype: "X-S-L",
  axisVector: {
    continuityChange: -0.72,
    personSystem: -0.55,
    craftLeverage: -0.81,
  },
  nonNegotiables: ["Integrity", "Long-term thinking", "Patience", "Craftsmanship"],
};

export const MOCK_CANDIDATES: MatchCandidate[] = [
  {
    id: "cand-01",
    name: "Jeremy Arche",
    organization: "Arche Studio",
    role: "Founder & Host",
    memberType: "creator",
    imageUrl: "https://picsum.photos/seed/jeremy-arche-studio/600/780",
    pitch:
      "Long-form interviews with operators who built institutions slowly.",
    bio: "Ten years building a quiet podcast network around builders who think in decades. Refuses the algorithm; trusts the work. Mid-six-figure audience, sharply concentrated.",
    archetype: "C-S-L",
    axisVector: {
      continuityChange: 0.78,
      personSystem: -0.62,
      craftLeverage: -0.71,
    },
    nonNegotiables: ["Long-term thinking", "Integrity", "Discipline"],
    coreValues: ["Patience", "Mastery", "Curiosity"],
    aspirationalValues: ["Reach", "Influence"],
    rarity: "founding",
  },
  {
    id: "cand-02",
    name: "Saanvi Rao",
    organization: "Frame & Function",
    role: "Creative Director",
    memberType: "creator",
    imageUrl: "https://picsum.photos/seed/saanvi-frame-function/600/780",
    pitch:
      "Visual essays on industrial design history and the systems behind objects.",
    bio: "Trained as an architect, became a video essayist. Treats every episode like a small monograph — researched for months, edited like a film. Mid-five-figure audience, deeply engaged.",
    archetype: "X-S-C",
    axisVector: {
      continuityChange: -0.45,
      personSystem: -0.7,
      craftLeverage: 0.85,
    },
    nonNegotiables: ["Craftsmanship", "Patience", "Honesty"],
    coreValues: ["Beauty", "Restraint", "Originality"],
    aspirationalValues: ["Scale", "Reach"],
    rarity: "featured",
  },
  {
    id: "cand-03",
    name: "Theo Marchetti",
    organization: "The Long Road",
    role: "Host & Producer",
    memberType: "creator",
    imageUrl: "https://picsum.photos/seed/theo-marchetti-longroad/600/780",
    pitch:
      "On-the-ground stories of family businesses surviving generational handoffs.",
    bio: "Travels to small-city businesses passed down through four generations. The microphone is always in someone's workshop. Builds slowly, audience compounds.",
    archetype: "C-P-C",
    axisVector: {
      continuityChange: 0.81,
      personSystem: 0.66,
      craftLeverage: 0.74,
    },
    nonNegotiables: ["Patience", "Integrity", "Roots"],
    coreValues: ["Care", "Lineage", "Place"],
    aspirationalValues: ["Reach"],
    rarity: null,
  },
  {
    id: "cand-04",
    name: "Iris Tanaka",
    organization: "Signal & Noise",
    role: "Founder",
    memberType: "creator",
    imageUrl: "https://picsum.photos/seed/iris-tanaka-signal/600/780",
    pitch:
      "Systems-thinking podcast about why coordinated change actually works.",
    bio: "Ex-McKinsey, now writes and broadcasts about institutional change. Each episode unpacks a single coordination problem. Smart, sharp, growing fast.",
    archetype: "X-S-L",
    axisVector: {
      continuityChange: -0.68,
      personSystem: -0.59,
      craftLeverage: -0.77,
    },
    nonNegotiables: ["Long-term thinking", "Craftsmanship", "Integrity"],
    coreValues: ["Rigor", "Honesty"],
    aspirationalValues: ["Influence", "Reach"],
    rarity: "featured",
  },
  {
    id: "cand-05",
    name: "Marcus Owen",
    organization: "Common Ground",
    role: "Host",
    memberType: "creator",
    imageUrl: "https://picsum.photos/seed/marcus-owen-commonground/600/780",
    pitch:
      "Field reporting from communities rebuilding civic institutions.",
    bio: "Former local-news reporter, now travels the country profiling civic experiments. The work is intimate, observational, deeply human. Cult audience among policy nerds.",
    archetype: "C-P-L",
    axisVector: {
      continuityChange: 0.6,
      personSystem: 0.78,
      craftLeverage: -0.52,
    },
    nonNegotiables: ["Honesty", "Care", "Patience"],
    coreValues: ["Place", "Service"],
    aspirationalValues: ["Reach", "Influence"],
    rarity: null,
  },
  {
    id: "cand-06",
    name: "Priya Shankar",
    organization: "Hot Take Lab",
    role: "Creator",
    memberType: "creator",
    imageUrl: "https://picsum.photos/seed/priya-shankar-hottakelab/600/780",
    pitch:
      "Short, kinetic explainer videos about culture-tech collisions.",
    bio: "Built a million-subscriber channel in eighteen months. Fast, opinionated, plugged into every cultural moment. Polarizing — which is part of the appeal.",
    archetype: "X-P-L",
    axisVector: {
      continuityChange: -0.85,
      personSystem: 0.7,
      craftLeverage: -0.88,
    },
    nonNegotiables: ["Speed", "Honesty"],
    coreValues: ["Reach", "Energy"],
    aspirationalValues: ["Craft", "Mastery"],
    rarity: null,
  },
];
