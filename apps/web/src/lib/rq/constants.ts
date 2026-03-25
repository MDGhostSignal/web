/**
 * RQ Index Constants
 * Word pools, descriptions, and scoring data
 */

export const BRAND = {
  company: "GHOSTSignal",
  acronym: "RQ",
  title: "Resonance Index",
  subtitle: "Find your signal. Name your resonance.",
  cta: "Generate My RQ",
  accent: "#C7F9FF",
} as const;

/**
 * Axis metadata for graph visualization
 */
export const AXES = {
  values: {
    name: "Values Orientation",
    leftLabel: "Implicit",
    rightLabel: "Formative",
    leftLetter: "I",
    rightLetter: "F",
    description:
      "This axis reflects how your convictions show up in your work. On the Formative end, values are named, declared, and actively shaping the message—what you stand for is part of what you say. On the Implicit end, values are lived rather than stated—what you stand for is revealed through tone, choices, and outcomes.",
    interpretationNote:
      "Neither is more \"true\" than the other. This is about where your signal is most naturally expressed: spoken or embodied, explicit or ambient.",
  },
  authenticity: {
    name: "Authenticity Expression",
    leftLabel: "Structural",
    rightLabel: "Relational",
    leftLetter: "S",
    rightLetter: "R",
    description:
      "This axis captures how your voice carries trust. On the Relational end, authenticity flows through story, personality, and lived experience—people trust you because they feel like they know you. On the Structural end, authenticity comes through clarity, consistency, and well-formed ideas—people trust you because your message holds together.",
    interpretationNote:
      "This is not a choice between warmth and rigor. It's about whether your signal lands more through connection or construction, presence or precision.",
  },
  horizon: {
    name: "Flourishing Horizon",
    leftLabel: "Long-Arc",
    rightLabel: "Catalytic",
    leftLetter: "L",
    rightLetter: "C",
    description:
      "This axis reveals how you think about growth, impact, and partnership over time. On the Long-Arc end, you prioritize depth, durability, and relationships that compound slowly—trust is built and protected over time. On the Catalytic end, you value momentum, activation, and timely impact—energy is directed toward movement and measurable lift.",
    interpretationNote:
      "Both create real value. This axis simply shows whether your signal is oriented toward endurance or ignition, formation or acceleration.",
  },
} as const;

/**
 * Score strength interpretation
 */
export const SCORE_BANDS = {
  light: {
    range: "1–3",
    label: "Lighter Signal",
    description:
      "Present, but flexible. You likely have range here, and can move across the spectrum without much friction.",
  },
  balanced: {
    range: "4–6",
    label: "Balanced Signal",
    description:
      "A clear leaning, but with openness. You can adapt without losing yourself.",
  },
  strong: {
    range: "7–10",
    label: "Strong Signal",
    description:
      "A defining part of how you operate. Alignment here matters more, and mismatches are easier to feel.",
  },
} as const;

/**
 * Word pools for RQ name generation
 * Organized by axis and letter, with 3 bands (0=1-3, 1=4-5, 2=6-10)
 */
export const WORDS = {
  Values: {
    F: ["Quiet", "Grounded", "Beacon"],
    I: ["Subtle", "Embodied", "Veiled"],
  },
  Authenticity: {
    R: ["Soft", "Warm", "Intimate"],
    S: ["Clear", "Ordered", "Architected"],
  },
  Horizon: {
    L: ["Patient", "Seasoned", "Enduring"],
    C: ["Quick", "Kinetic", "Igniting"],
  },
} as const;

/**
 * Profile descriptions for each axis letter and band
 */
export const DESCRIPTIONS = {
  Values: {
    F: [
      "F (1–3) — Quietly Convicted. You have real convictions, but you tend to live them more than declare them. The upside is approachability and wide welcome—your signal doesn't need a banner to be felt. You likely want partnerships that respect nuance and don't force your voice into slogans. Look for matches that honor subtle integrity, speak with humility, and can align without demanding constant public value-signaling.",
      'F (4–5) — Intentionally Grounded. You can name your values clearly when it matters, but you don\'t lead with them at every turn. The upside is balance: enough clarity to anchor trust without narrowing your audience unnecessarily. You want partners who "get it" without performative agreement. Look for matches who can articulate alignment in context, keep messaging natural, and treat your values as a compass—not a costume.',
      "F (6–10) — Explicitly Formative. Your convictions are central to your identity and impact, and you're comfortable naming them. The upside is deep resonance with the people you're meant to serve; the tradeoff is selectivity. You want partners who are unembarrassed about what they stand for and who won't dilute shared convictions for convenience. Look for matches with clear principles, honest boundaries, and a desire to build trust through clarity.",
    ],
    I: [
      "I (1–3) — Minimally Implicit. You don't rely much on values-language to do good work. Your orientation is practical: what serves, what works, what helps people. The upside is flexibility and ease across difference. You want low-friction partnerships and may find heavy moral framing distracting. Look for matches who respect action over rhetoric, keep things straightforward, and don't require shared philosophical language to collaborate well.",
      "I (4–5) — Practically Implicit. Your values are consistent in practice, even if you don't constantly name them. The upside is steadiness—people sense integrity without needing a manifesto. You want partners who value coherence, reliability, and outcomes that feel human. Look for matches who align on behavior and tone, respect your preference for understated conviction, and contribute meaning without demanding constant explanation.",
      "I (6–10) — Deeply Embodied. Your values are so integrated that naming them can feel reductive. People trust you because your integrity is felt before it's explained. The upside is profound authenticity; the risk is mismatch with partners who need explicit framing. You want collaborators who can read between the lines and honor lived conviction. Look for matches who respect embodiment, communicate with care, and let alignment show itself over time.",
    ],
  },
  Authenticity: {
    R: [
      "R (1–3) — Lightly Relational. You value warmth and trust, but you don't build authenticity primarily through personal disclosure. The upside is professionalism and healthy boundaries. You want partnerships that respect distance where needed and don't require emotional intimacy to feel real. Look for matches who communicate cleanly, avoid oversharing, and can integrate without pushing your voice into a more confessional register than you prefer.",
      "R (4–5) — Naturally Relational. You build trust through story, conversation, and lived experience—without making it all about you. The upside is a human signal that feels both grounded and inviting. You want partners who can speak naturally, adapt tone, and honor the relational fabric of your audience. Look for matches that feel conversational, non-performative, and comfortable being introduced through real-life testimony.",
      "R (6–10) — Deeply Relational. Your signal travels through closeness: personal voice, lived experience, and an audience bond that's earned. The upside is powerful resonance; the risk is dissonance when messaging feels forced or overly structured. You want partners who respect the trust you steward and who can blend seamlessly into your cadence. Look for matches that feel like trusted friends—credible, humble, and genuinely aligned.",
    ],
    S: [
      "S (1–3) — Minimally Structural. You're flexible and improvisational; structure exists, but loosely. The upside is creativity and adaptability. You want partners who can flow with spontaneity and don't require strict scripts. Look for matches who are comfortable with iteration, can keep promises without micromanaging the message, and value authenticity as presence rather than polish.",
      "S (4–5) — Intentionally Structured. You value coherence and clarity, but you're not rigid. The upside is trust through consistency—people know what to expect from you. You want partners who respect tone and framing without sounding scripted. Look for matches who can align to your structure, keep messaging clean, and treat consistency as a form of care for your audience.",
      "S (6–10) — Highly Structural. You steward voice and messaging with precision; authenticity comes through coherence, craft, and intentionality. The upside is clarity and integrity at scale; the risk is stiffness if partners can't fit the frame. You want collaborators who appreciate structure as respect, not control. Look for matches who can operate within clear guardrails, communicate with rigor, and help your signal stay unmistakably yours.",
    ],
  },
  Horizon: {
    L: [
      "L (1–3) — Lightly Long-Arc. You appreciate continuity, but you don't require permanence for a partnership to be worthwhile. The upside is flexibility and experimentation. You want partners who can test and learn without overcommitting too soon. Look for matches who are steady and respectful, even in shorter engagements, and who leave the relationship stronger than they found it.",
      "L (4–5) — Seasonally Long-Arc. You value trust-building over time, but in defined seasons. The upside is realism: relationships deepen without forcing forever. You want partners who think beyond a single moment while respecting natural cycles. Look for matches who can build chapter by chapter, communicate clearly, and treat partnership like a craft—not a one-off transaction.",
      "L (6–10) — Deeply Long-Arc. You think in years, not quarters. You prioritize durability, legacy, and mutual formation. The upside is compounding trust and coherence; the cost is patience. You want partners willing to invest slowly and build with care. Look for matches who value long-term reputation, shared story, and alignment that deepens instead of decays.",
    ],
    C: [
      "C (1–3) — Lightly Catalytic. You like momentum, but not at the cost of meaning. The upside is responsiveness without frenzy. You want partners who can move decisively when needed while staying human. Look for matches who respect your pace, communicate clearly, and don't mistake urgency for importance.",
      "C (4–5) — Strategically Catalytic. You value focused bursts of energy that serve a bigger mission. The upside is intentional activation without becoming shallow. You want partners who can execute, measure, and reflect. Look for matches who can translate alignment into action, honor clear goals, and keep the signal clean while the work moves quickly.",
      "C (6–10) — Highly Catalytic. You thrive on momentum, activation, and visible lift. The upside is energy and reach; the risk is burnout or mismatch with slow builders. You want partners who can keep pace without cutting corners on integrity. Look for matches who share urgency, iterate fast, and still protect trust as the foundation of conversion.",
    ],
  },
} as const;
