/**
 * XQ Index Constants
 *
 * Question banks (Phase 1 archetype dilemmas + Phase 2 value diagnostic),
 * archetype definitions, and brand metadata for the Conviction Index
 * (XQ) quiz. Sourced verbatim from Jeremy's XQ Draft (docs/XQ Draft.txt).
 *
 * The XQ is the free, top-of-funnel half of GhostSignal's matching
 * ecosystem (RQ being the premium engine). See
 * `~/.claude/.../memory/project_rq_xq_ecosystem.md` for the framing.
 */

export const BRAND = {
  company: "GHOSTSignal",
  acronym: "XQ",
  title: "The Conviction Index",
  subtitle:
    "An Advanced Psychometric Audit of Strategic Convictions and Lived Business Values.",
  cta: "Generate My XQ",
  accent: "#C7F9FF",
} as const;

/* =====================================================================
 * Phase 1 — Contextual Archetype Dilemmas (18 questions, 6 per axis).
 *
 * Three binary axes:
 *   axis1: C (Continuity) vs X (Change)        — CX prefix
 *   axis2: P (Person)     vs S (System)        — PS prefix
 *   axis3: C (Craft)      vs L (Leverage)      — CL prefix
 *
 * Internally we track axis 3's "C" under key `C2` to avoid colliding
 * with axis 1's `C` in the score accumulator. The final letter code
 * still emits "C" for Craft (matching Jeremy's archetype lookup).
 * ===================================================================== */

export type AxisKey = "C" | "X" | "P" | "S" | "C2" | "L";

export type Phase1Question = {
  id: string;
  /** Axis key the "a" side scores into. */
  axis: AxisKey;
  /** Axis key the "b" side scores into. */
  bAxis: AxisKey;
  text: string;
  aLabel: string;
  bLabel: string;
  aVal: number;
  bVal: number;
};

export const PHASE1_QUESTIONS: readonly Phase1Question[] = [
  // Axis 1: Continuity (C) vs Change (X)
  { id: "CX1", axis: "C", bAxis: "X", aVal: 2, bVal: 2, text: "You are designing a brand-new venture. You want your market positioning to feel...", aLabel: "Deeply rooted in historical precedent, carrying a timeless lineage forward.", bLabel: "Entirely unprecedented, rendering old industry assumptions completely obsolete." },
  { id: "CX2", axis: "C", bAxis: "X", aVal: 2, bVal: 2, text: "A major economic and cultural shift threatens your current revenue engine. Your immediate instinct is to...", aLabel: "Double down on your core competencies and weather the storm by anchoring to what has historically worked.", bLabel: "Liquidate or aggressively restructure your offering to pioneer a raw, unproven alternative instantly." },
  { id: "CX3", axis: "C", bAxis: "X", aVal: 1, bVal: 1, text: "You are appointing a critical strategic advisor to protect your long-term vision. You lean toward...", aLabel: "The seasoned traditionalist who knows the history, traps, and foundational rules of the game.", bLabel: "The radical iconoclast who is eager to challenge your baseline thinking and break your current model." },
  { id: "CX4", axis: "C", bAxis: "X", aVal: 1, bVal: 1, text: "You have extra capital at the end of the fiscal year. You choose to deploy it toward...", aLabel: "Preservation: Upgrading, repairing, and reinforcing your existing core systems to ensure they last for decades.", bLabel: "Exploration: Funding highly experimental, high-risk creative bets that could fail completely or alter everything." },
  { id: "CX5", axis: "C", bAxis: "X", aVal: 1, bVal: 1, text: "When you look back at historical models of enterprise, your natural posture is one of...", aLabel: "Deep reverence for the foundational stability and wisdom built by previous generations.", bLabel: "Critical skepticism regarding their systemic limitations and outdated frameworks." },
  { id: "CX6", axis: "C", bAxis: "X", aVal: 1, bVal: 1, text: "When everything in your market is changing rapidly, the highest priority of leadership must be...", aLabel: "Protecting the core identity and remaining a steady, immovable anchor of trust.", bLabel: "Evolving the operations constantly to absorb and ride the wave of disruption." },
  // Axis 2: Person (P) vs System (S)
  { id: "PS1", axis: "P", bAxis: "S", aVal: 2, bVal: 2, text: "Your company is launching an internal initiative. You define its definitive victory by...", aLabel: "The deeply moving personal narratives and qualitative transformation of individual stakeholders.", bLabel: "The structural optimization, scalable efficiency, and systemic health of the entire operation." },
  { id: "PS2", axis: "P", bAxis: "S", aVal: 2, bVal: 2, text: "A massive operational error occurs that damages an external client's trust. Your primary diagnostic focus goes directly to...", aLabel: "The relational rupture: Healing the interpersonal breach, apologizing, and restoring human proximity.", bLabel: "The mechanical failure: Auditing operating procedures, rewriting protocols, and building automated guardrails." },
  { id: "PS3", axis: "P", bAxis: "S", aVal: 1, bVal: 1, text: "You are hiring a critical leadership executive. You prioritize candidates who embody...", aLabel: "Deep empathy, relational intelligence, and a soul that aligns with the human culture of your team.", bLabel: "Exceptional systemic mastery, structural discipline, and a proven track record of repeatable execution." },
  { id: "PS4", axis: "P", bAxis: "S", aVal: 1, bVal: 1, text: "To handle your next phase of organizational growth, your largest capital investment goes to...", aLabel: "People: Expanding benefits, creating high-touch coaching spaces, and investing heavily in human talent.", bLabel: "Infrastructure: Investing in sophisticated enterprise software, automation tools, and bulletproof mechanics." },
  { id: "PS5", axis: "P", bAxis: "S", aVal: 1, bVal: 1, text: "When building an audience or client base, you believe deep loyalty is primarily generated by...", aLabel: "The personal, unique, and highly human connection they feel with you or your representatives.", bLabel: "The absolute consistency, predictability, and flawless utility of the service ecosystem." },
  { id: "PS6", axis: "P", bAxis: "S", aVal: 1, bVal: 1, text: "If an organization has a high-performing culture but toxic structural incentives, you believe you must...", aLabel: "Focus first on realigning the people, repairing hearts, and re-establishing communal trust.", bLabel: "Dismantle and rebuild the administrative rules and metrics, knowing behavior follows incentives." },
  // Axis 3: Craft (C2 internally → "C" in code) vs Leverage (L)
  { id: "CL1", axis: "C2", bAxis: "L", aVal: 2, bVal: 2, text: "If your name is attached to a product or medium, you want it to be spoken of as...", aLabel: "An absolute masterpiece: Exquisite, deeply detailed, and cherished by an intentional, discerning few.", bLabel: "A ubiquitous utility: Massively useful, highly accessible, and adopted globally by millions." },
  { id: "CL2", axis: "C2", bAxis: "L", aVal: 2, bVal: 2, text: "Inflation and rising costs force a structural compromise on your core offering. You choose to...", aLabel: "Keep the quality entirely intact, raising prices significantly and risking the loss of mainstream buyers.", bLabel: "Absorb the quality hit or simplify the offering to keep it affordable and accessible to the masses." },
  { id: "CL3", axis: "C2", bAxis: "L", aVal: 1, bVal: 1, text: "You are building out your core production team. You find yourself naturally biased toward...", aLabel: "The Obsessive Artisan: Works with extreme focus, values perfection, and refuses to ship compromised work.", bLabel: "The High-Volume Producer: Understands velocity, builds for ultimate leverage, and drives distribution." },
  { id: "CL4", axis: "C2", bAxis: "L", aVal: 1, bVal: 1, text: "You are given an unexpected marketing windfall budget. You choose to spend it on...", aLabel: "Creating an ultra-premium, intimate, high-touch experience or bespoke artifact for your top 100 advocates.", bLabel: "Running a massive, highly optimized digital campaign to acquire 50,000 net-new users globally." },
  { id: "CL5", axis: "C2", bAxis: "L", aVal: 1, bVal: 1, text: "When analyzing highly successful business models, you feel the greatest internal resonance with...", aLabel: "Small, highly independent, uncompromising studios that maintain total mastery over their form.", bLabel: "Expansive, hyper-scalable networks that have successfully weaponized leverage to impact a macro-market." },
  { id: "CL6", axis: "C2", bAxis: "L", aVal: 1, bVal: 1, text: "To you, the greatest tragedy of growth is...", aLabel: "The dilution of quality, soul, and aesthetic care that inevitably occurs when things get too big.", bLabel: "The waste of massive structural potential when an excellent concept remains small and insular." },
] as const;

/* =====================================================================
 * Phase 2 — Value Sussing Evaluative Questions (14 questions across
 * 7 domains). Each answer maps to a named value string that goes into
 * the user's "value pool" for the Phase 3 stress tests.
 * ===================================================================== */

export type Phase2Domain =
  | "Stewardship"
  | "Human Dignity"
  | "Cultural Imagination"
  | "Social Order"
  | "Economic Ethic"
  | "Meaning & Metaphysics"
  | "Risk & Change";

export type Phase2Question = {
  id: string;
  domain: Phase2Domain;
  text: string;
  aLabel: string;
  aValue: string;
  bLabel: string;
  bValue: string;
};

export const PHASE2_QUESTIONS: readonly Phase2Question[] = [
  { id: "VD1", domain: "Stewardship", text: "When allocating long-term capital or resources, you are more motivated by...", aLabel: "Ensuring the survival and protection of your baseline assets for the next generation.", aValue: "Capital Preservation", bLabel: "Investing in initiatives that ensure the ecological and operational durability of your environment.", bValue: "Sustainability" },
  { id: "VD2", domain: "Stewardship", text: "Your primary fear regarding long-term resource management is...", aLabel: "Over-extending and running out of runway due to speculative layouts.", aValue: "Long-Term Viability", bLabel: "Failing to fulfill your explicit moral or legal duties to those who trusted you with their assets.", bValue: "Fiduciary Responsibility" },
  { id: "VD3", domain: "Human Dignity", text: "When designing your baseline client or employee experiences, your absolute highest priority is...", aLabel: "Protecting individual choice, personal sovereignty, and the right to self-direct.", aValue: "Individual Agency", bLabel: "Creating an ecosystem where people feel radically welcomed, seen, and sheltered.", bValue: "Radical Hospitality" },
  { id: "VD4", domain: "Human Dignity", text: "When you look at structural brokenness in your modern marketplace, your focus goes directly to...", aLabel: "Systems that treat humans as disposable variables or extract value unfairly from the weak.", aValue: "Exploitation Resistance", bLabel: "The disruption of modern loneliness and the breakdown of supportive family frameworks.", bValue: "Family Flourishing" },
  { id: "VD5", domain: "Cultural Imagination", text: "You believe the ultimate purpose of your creative output (media, design, content) is to...", aLabel: "Disrupt the current cultural landscape by introducing an entirely superior, alternate perspective.", aValue: "Paradigm Disruption", bLabel: "Uncompromisingly articulate the raw, necessary facts, even if it causes immediate friction.", bValue: "Truth-Telling" },
  { id: "VD6", domain: "Cultural Imagination", text: "When evaluating the absolute metric of success for your creations, you search for...", aLabel: "Absolute aesthetic perfection, timeless design metrics, and masterwork execution.", aValue: "Aesthetic Excellence", bLabel: "Retaining total creative freedom and baseline sovereignty from external corporate gatekeepers.", bValue: "Creative Sovereignty" },
  { id: "VD7", domain: "Social Order", text: "An institution or enterprise platform is only legitimate when it demonstrates...", aLabel: "Uncompromising accountability and strict moral standards for its executive leadership.", aValue: "Moral Accountability", bLabel: "Flawless operational clarity, total compliance, and highly predictable consistency.", bValue: "Predictable Consistency" },
  { id: "VD8", domain: "Social Order", text: "You believe healthy societies and market frameworks are ultimately held together by...", aLabel: "A deep, shared institutional respect for systemic rules, contracts, and legal frameworks.", aValue: "Rule of Law", bLabel: "An organic historical inheritance and a protective care for foundational continuity.", bValue: "Generational Continuity" },
  { id: "VD9", domain: "Economic Ethic", text: "In high-stakes commercial transactions, you are fundamentally obsessed with ensuring...", aLabel: "That the people actually executing and hand-crafting the work retain a fair, protected stake in its upside.", aValue: "Creator Equity", bLabel: "Absolute structural transparency about pricing, origins, margins, and data metrics.", bValue: "Market Transparency" },
  { id: "VD10", domain: "Economic Ethic", text: "Your operational layout is specifically engineered to aggressively resist...", aLabel: "Extractive, transactional short-term margin targets that leave a consumer base emotionally depleted.", aValue: "Anti-Extractive Systems", bLabel: "Superficial styling or hype, verifying instead that everything built possesses high utility.", bValue: "Productive Utility" },
  { id: "VD11", domain: "Meaning & Metaphysics", text: "You view your professional calling or venture development primarily as...", aLabel: "A sacred vocation and structural calling that you have been uniquely ordered to execute.", aValue: "Sacred Vocation", bLabel: "An intentional internal framework pointing toward personal wisdom and deep interior alignment.", bValue: "Interior Alignment" },
  { id: "VD12", domain: "Meaning & Metaphysics", text: "You are most deeply repelled by business profiles that display...", aLabel: "Spiritually thin, highly commoditized mechanics that lack existential narrative depth.", aValue: "Existential Depth", bLabel: "Rootless modern positioning that shifts with social trends without anchoring to absolute truth.", bValue: "Spiritual Rootedness" },
  { id: "VD13", domain: "Risk & Change", text: "When initiating a massive strategic pivot or rollout, your style is defined by...", aLabel: "Calculated Audacity: Willing to hazard massive, terrifying layouts to unlock a raw frontier.", aValue: "Calculated Audacity", bLabel: "Sacrificial Courage: Willing to stand completely isolated for your principles, despite the net cost.", bValue: "Sacrificial Courage" },
  { id: "VD14", domain: "Risk & Change", text: "Your long-range systemic framework for managing cultural or economic chaos relies on...", aLabel: "Antifragility: Setting up your operational infrastructure so that it actively harvests strength from volatility.", aValue: "Antifragility", bLabel: "Strategic Restraint: Possessing the strict discipline to filter out noise and protect your core focus.", bValue: "Strategic Restraint" },
] as const;

/* =====================================================================
 * Archetypes — 8 codes formed by the three binary axes.
 * Code format: `${axis1}-${axis2}-${axis3}` where letters come from
 *   {C, X} · {P, S} · {C, L}.
 * ===================================================================== */

export type ArchetypeCode =
  | "C-P-C"
  | "C-P-L"
  | "C-S-C"
  | "C-S-L"
  | "X-P-C"
  | "X-P-L"
  | "X-S-C"
  | "X-S-L";

export type ArchetypeDef = {
  name: string;
  tagline: string;
  desc: string;
};

export const ARCHETYPES: Record<ArchetypeCode, ArchetypeDef> = {
  "C-P-C": {
    name: "The Steward",
    tagline: "The Guardian of Sacred Fire.",
    desc: "The Steward protects what is good, prioritizes people, and builds with patience and care. This profile is rooted in continuity, dignity, and craft—favoring work that feels human, durable, and well-made. Stewards tend to guard depth fiercely against the modern erosion of speed and cheap replication, measuring success by the absolute integrity of the work and proximity to those they serve.",
  },
  "C-P-L": {
    name: "The Shepherd",
    tagline: "The Community Unifier.",
    desc: "The Shepherd carries what is good outward. This profile is human-centered and continuity-minded, but also wants meaningful ideas to reach more people. Shepherds focus on widening the circle of invitation without watering down their foundational principles. They believe growth should feel like a welcoming movement, scaling through organic relationship, hospitality, and shared flourishing.",
  },
  "C-S-C": {
    name: "The Conservator",
    tagline: "The Master Craftsman of Order.",
    desc: "The Conservator preserves order, integrity, and excellence through careful structure. This profile values systems that protect what matters and craftsmanship that resists cheapening. Conservators resist the chaotic trend of 'moving fast and breaking things.' Instead, they build with architectural precision, creating beautifully tuned systems or frameworks designed to withstand volatility.",
  },
  "C-S-L": {
    name: "The Institution Builder",
    tagline: "The Legacy Architect.",
    desc: "The Institution Builder creates durable systems that can carry meaning at scale. This profile values continuity, structure, and reach—building frameworks strong enough to outlast the moment. Institution Builders think in decades, not quarters. They are drawn to building grand, enduring infrastructure—companies or massive networks—that serve as the foundational bedrock for an industry.",
  },
  "X-P-C": {
    name: "The Artisan Reformer",
    tagline: "The Subversive Creator.",
    desc: "The Artisan Reformer reimagines the world through deeply human, carefully made work. This profile is change-oriented, person-centered, and craft-driven—favoring transformation that remains intimate, beautiful, and embodied. Artisan Reformers disrupt the status quo not through aggressive force, but through aesthetic and relational contrast, proving business can be done with a soul.",
  },
  "X-P-L": {
    name: "The Catalyst",
    tagline: "The Cultural Spark.",
    desc: "The Catalyst seeks change that reaches people. This profile is future-facing, human-centered, and expansive—drawn to movement, momentum, and meaningful activation. Catalysts are movement makers who excel at identifying broken paradigms, introducing a better way of living or thinking, and mobilizing massive groups of people to adopt a new future quickly and passionately.",
  },
  "X-S-C": {
    name: "The Designer",
    tagline: "The Strategic Innovator.",
    desc: "The Designer reimagines systems through precision, form, and intentionality. This profile values change, structure, and craft—building new patterns with care rather than chaos. Designers approach change with a blueprint in hand. They love to rebuild broken models, combining high-level strategic creativity with an obsessive focus on detail, form, and structural coherence.",
  },
  "X-S-L": {
    name: "The Architect",
    tagline: "The Systemic Disruptor.",
    desc: "The Architect builds new systems for large-scale transformation. This profile is change-oriented, system-minded, and expansive—drawn to frameworks that can move culture, markets, or institutions. Driven by massive leverage points, they design expansive ecosystems or market-shifting enterprises meant to transition society away from outdated models.",
  },
};

/* Human-readable labels for the three triangulated vector bias axes —
 * surfaced on the results dossier under "Triangulated Vector Bias". */

export const AXIS_LABELS = {
  axis1: { C: "Continuity", X: "Change" },
  axis2: { P: "Person", S: "System" },
  axis3: { C: "Craft", L: "Leverage" },
} as const;
