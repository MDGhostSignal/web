/**
 * Mock dataset for the /admin/marketplace surface — 10 creators + 20
 * brands. Every record is flagged `is_mock: true` and surfaces as a
 * "MOCK" pill in the UI. Replace with real data (likely from the
 * Members CRM + RQ submissions) once those pipelines are in place.
 *
 * RQ trait shape:
 *   - values        — convictions / what they stand for (0–100)
 *   - authenticity  — signal clarity / how unfiltered they are (0–100)
 *   - horizon       — outlook / future-orientation (0–100)
 *
 * The "small RQ" is just these three axes. The "huge RQ" (not yet
 * built) will add more dimensions; the matching algorithm in
 * `marketplace-match.ts` is written so that adding axes is a one-line
 * extension to TRAIT_KEYS without touching call sites.
 */

export type TraitKey = "values" | "authenticity" | "horizon";

export const TRAIT_KEYS: readonly TraitKey[] = [
  "values",
  "authenticity",
  "horizon",
] as const;

export const TRAIT_LABELS: Record<TraitKey, string> = {
  values: "Values",
  authenticity: "Authenticity",
  horizon: "Horizon",
};

export type Traits = Record<TraitKey, number>;

export type EntityKind = "creator" | "brand";

export type MarketplaceEntity = {
  id: string;
  kind: EntityKind;
  name: string;
  /** Member's organization / brand name when known. Real members only;
   *  the seed mocks in this file leave it undefined. */
  organization?: string | null;
  /** RQ archetype code, mirrors `rq_submissions.rq_code` shape. */
  rq_code: string;
  /** Human-readable archetype, mirrors `rq_submissions.rq_name`. */
  rq_name: string;
  /** Primary tags for filter chips + tooltips. */
  tags: readonly string[];
  /** One-line essence — shown on hover and on the cards. */
  blurb: string;
  /** Trait scores 0–100 across the three RQ axes. */
  traits: Traits;
  /** True for the seed mocks in this file (shown with a MOCK pill in
      the UI). False for real members upstreamed from /admin/leads via
      the `became_member_at` flag — those rows render without the
      MOCK pill so they're distinguishable from the seed data. */
  is_mock: boolean;
};

/* =====================================================================
 * Creators (10)
 *
 * Each creator's traits skew toward the kinds of brand they'd resonate
 * with — high-values + high-authenticity creators will pair best with
 * high-values + high-authenticity brands, etc. Spread is deliberate so
 * not every brand has a perfect match: matchmaking has stakes.
 * ===================================================================== */

export const MOCK_CREATORS: readonly MarketplaceEntity[] = [
  {
    id: "c-01",
    kind: "creator",
    name: "Holly Stallcup",
    rq_code: "RQ-A1",
    rq_name: "Hearth-Lit Storyteller",
    tags: ["faith", "memoir", "long-form"],
    blurb: "Unseriously: long-form audio essays on belief and ordinary life.",
    traits: { values: 92, authenticity: 88, horizon: 70 },
    is_mock: true,
  },
  {
    id: "c-02",
    kind: "creator",
    name: "Andrew Osenga",
    rq_code: "RQ-B2",
    rq_name: "Quiet Builder",
    tags: ["music", "craft", "podcast"],
    blurb: "Songwriter-host. Conversations about making things that last.",
    traits: { values: 84, authenticity: 90, horizon: 62 },
    is_mock: true,
  },
  {
    id: "c-03",
    kind: "creator",
    name: "The Rabbit Room",
    rq_code: "RQ-A2",
    rq_name: "Communal Lantern",
    tags: ["literature", "community", "arts"],
    blurb: "Slow-grown community of readers, writers, and musicians.",
    traits: { values: 95, authenticity: 82, horizon: 55 },
    is_mock: true,
  },
  {
    id: "c-04",
    kind: "creator",
    name: "Thinking Christian Ed",
    rq_code: "RQ-C1",
    rq_name: "Reasoned Pilgrim",
    tags: ["education", "faith", "philosophy"],
    blurb: "Philosophy of education for thoughtful classical schools.",
    traits: { values: 88, authenticity: 76, horizon: 68 },
    is_mock: true,
  },
  {
    id: "c-05",
    kind: "creator",
    name: "Maren & The Mile",
    rq_code: "RQ-D3",
    rq_name: "Open-Road Diarist",
    tags: ["travel", "memoir", "video"],
    blurb: "Solo road trips through the American interior; quiet, honest.",
    traits: { values: 70, authenticity: 92, horizon: 88 },
    is_mock: true,
  },
  {
    id: "c-06",
    kind: "creator",
    name: "Jeremiah Park",
    rq_code: "RQ-B1",
    rq_name: "Workshop Foreman",
    tags: ["craft", "small-business", "interview"],
    blurb: "How small American businesses actually get built and survive.",
    traits: { values: 76, authenticity: 84, horizon: 80 },
    is_mock: true,
  },
  {
    id: "c-07",
    kind: "creator",
    name: "Field Notes Quarterly",
    rq_code: "RQ-C2",
    rq_name: "Patient Observer",
    tags: ["essay", "nature", "long-form"],
    blurb: "Seasonal essays on landscape, place, and attention.",
    traits: { values: 80, authenticity: 78, horizon: 72 },
    is_mock: true,
  },
  {
    id: "c-08",
    kind: "creator",
    name: "Iris & Honey",
    rq_code: "RQ-A3",
    rq_name: "Kindred Hosts",
    tags: ["family", "homemaking", "podcast"],
    blurb: "Two friends on raising children, keeping homes, and ageing well.",
    traits: { values: 90, authenticity: 86, horizon: 50 },
    is_mock: true,
  },
  {
    id: "c-09",
    kind: "creator",
    name: "Frequency North",
    rq_code: "RQ-D1",
    rq_name: "Future-Tilt Reporter",
    tags: ["technology", "interview", "future"],
    blurb: "Conversations with people building the next 30 years.",
    traits: { values: 60, authenticity: 70, horizon: 96 },
    is_mock: true,
  },
  {
    id: "c-10",
    kind: "creator",
    name: "South Light Studio",
    rq_code: "RQ-B3",
    rq_name: "Sunlit Documentarian",
    tags: ["documentary", "place", "video"],
    blurb: "Short documentaries about Southern places worth remembering.",
    traits: { values: 82, authenticity: 88, horizon: 64 },
    is_mock: true,
  },
];

/* =====================================================================
 * Brands (20)
 *
 * Brands store the RQ traits they're SEEKING in a creator partner —
 * "what audience should we land in front of?" — not the brand's own
 * self-rating. This makes the resonance distance directly meaningful:
 * brand.traits = creator.traits → perfect match.
 * ===================================================================== */

export const MOCK_BRANDS: readonly MarketplaceEntity[] = [
  {
    id: "b-01",
    kind: "brand",
    name: "Stoneridge Coffee Co.",
    rq_code: "RQ-A1",
    rq_name: "Family-Roastery Heritage",
    tags: ["coffee", "small-batch", "heritage"],
    blurb: "Third-gen roastery. Wants creators whose audience cares about provenance.",
    traits: { values: 90, authenticity: 92, horizon: 60 },
    is_mock: true,
  },
  {
    id: "b-02",
    kind: "brand",
    name: "Larkspur Linens",
    rq_code: "RQ-A2",
    rq_name: "Heirloom Maker",
    tags: ["home", "textile", "craft"],
    blurb: "Slow-made linens. Looking for makers' communities.",
    traits: { values: 92, authenticity: 84, horizon: 50 },
    is_mock: true,
  },
  {
    id: "b-03",
    kind: "brand",
    name: "Northbound Outfitters",
    rq_code: "RQ-D2",
    rq_name: "Open-Country Outfitter",
    tags: ["outdoor", "gear", "adventure"],
    blurb: "Backcountry gear. Seeks audiences that actually go outside.",
    traits: { values: 72, authenticity: 88, horizon: 84 },
    is_mock: true,
  },
  {
    id: "b-04",
    kind: "brand",
    name: "Hearthkeeper Cookware",
    rq_code: "RQ-A3",
    rq_name: "Generational Kitchen",
    tags: ["kitchen", "heritage", "craft"],
    blurb: "Cast-iron + carbon steel. Pots passed to grandchildren.",
    traits: { values: 88, authenticity: 82, horizon: 52 },
    is_mock: true,
  },
  {
    id: "b-05",
    kind: "brand",
    name: "Common Ground Insurance",
    rq_code: "RQ-C2",
    rq_name: "Plainspoken Protector",
    tags: ["finance", "trust", "service"],
    blurb: "Mutual insurer. Plain talk about money and risk.",
    traits: { values: 78, authenticity: 80, horizon: 70 },
    is_mock: true,
  },
  {
    id: "b-06",
    kind: "brand",
    name: "Woodfern Books",
    rq_code: "RQ-A2",
    rq_name: "Independent Press",
    tags: ["publishing", "literature", "indie"],
    blurb: "Small literary press. Authors who write to last.",
    traits: { values: 94, authenticity: 86, horizon: 58 },
    is_mock: true,
  },
  {
    id: "b-07",
    kind: "brand",
    name: "Lyra Audio",
    rq_code: "RQ-B2",
    rq_name: "Honest-Listening Hardware",
    tags: ["audio", "hardware", "craft"],
    blurb: "Headphones tuned for voice + acoustic. Made in Vermont.",
    traits: { values: 80, authenticity: 90, horizon: 64 },
    is_mock: true,
  },
  {
    id: "b-08",
    kind: "brand",
    name: "Plainfield Banking",
    rq_code: "RQ-C1",
    rq_name: "Local-First Bank",
    tags: ["finance", "regional", "trust"],
    blurb: "Community bank in 14 counties. Mortgages, not memes.",
    traits: { values: 84, authenticity: 78, horizon: 60 },
    is_mock: true,
  },
  {
    id: "b-09",
    kind: "brand",
    name: "Meridian Mapping",
    rq_code: "RQ-D1",
    rq_name: "Civic Cartographer",
    tags: ["technology", "civic", "data"],
    blurb: "Public-good mapping software. Wants thoughtful tech audiences.",
    traits: { values: 70, authenticity: 72, horizon: 92 },
    is_mock: true,
  },
  {
    id: "b-10",
    kind: "brand",
    name: "Field & Foundry Tools",
    rq_code: "RQ-B1",
    rq_name: "Workshop Supplier",
    tags: ["tools", "craft", "supply"],
    blurb: "Hand tools for serious amateurs. Forged, never injection-moulded.",
    traits: { values: 78, authenticity: 88, horizon: 76 },
    is_mock: true,
  },
  {
    id: "b-11",
    kind: "brand",
    name: "Chapelside Schools",
    rq_code: "RQ-C1",
    rq_name: "Classical Educator",
    tags: ["education", "faith", "K-12"],
    blurb: "Network of classical Christian schools. Wants thoughtful parent audiences.",
    traits: { values: 90, authenticity: 76, horizon: 64 },
    is_mock: true,
  },
  {
    id: "b-12",
    kind: "brand",
    name: "Goldstem Honey",
    rq_code: "RQ-A1",
    rq_name: "Family-Apiary",
    tags: ["food", "small-batch", "heritage"],
    blurb: "Mountain honey from a 90-year-old family apiary.",
    traits: { values: 88, authenticity: 90, horizon: 56 },
    is_mock: true,
  },
  {
    id: "b-13",
    kind: "brand",
    name: "Atlas Notebooks",
    rq_code: "RQ-D3",
    rq_name: "Traveler's Stationer",
    tags: ["stationery", "travel", "craft"],
    blurb: "Pocket notebooks for walkers, drivers, and pilots.",
    traits: { values: 70, authenticity: 86, horizon: 84 },
    is_mock: true,
  },
  {
    id: "b-14",
    kind: "brand",
    name: "Rookwood Furniture",
    rq_code: "RQ-A2",
    rq_name: "Heirloom Joiner",
    tags: ["furniture", "craft", "heritage"],
    blurb: "Hand-joined furniture. Built to be inherited.",
    traits: { values: 90, authenticity: 84, horizon: 54 },
    is_mock: true,
  },
  {
    id: "b-15",
    kind: "brand",
    name: "Southlight Coffee",
    rq_code: "RQ-B3",
    rq_name: "Place-Made Roastery",
    tags: ["coffee", "regional", "craft"],
    blurb: "Roaster celebrating Southern places + Southern producers.",
    traits: { values: 82, authenticity: 88, horizon: 66 },
    is_mock: true,
  },
  {
    id: "b-16",
    kind: "brand",
    name: "Brightwater Skincare",
    rq_code: "RQ-D3",
    rq_name: "Open-Sky Apothecary",
    tags: ["skincare", "natural", "wellness"],
    blurb: "Mineral-based skincare for life outside.",
    traits: { values: 68, authenticity: 80, horizon: 86 },
    is_mock: true,
  },
  {
    id: "b-17",
    kind: "brand",
    name: "Quartermast Audio",
    rq_code: "RQ-B2",
    rq_name: "Voice-First Studio Gear",
    tags: ["audio", "podcast", "hardware"],
    blurb: "Microphones + interfaces tuned for voice. Loved by podcasters.",
    traits: { values: 76, authenticity: 88, horizon: 72 },
    is_mock: true,
  },
  {
    id: "b-18",
    kind: "brand",
    name: "Kindred Goods Co-op",
    rq_code: "RQ-A3",
    rq_name: "Family-Goods Cooperative",
    tags: ["family", "homemaking", "co-op"],
    blurb: "Member-owned co-op for household goods. Built around family use.",
    traits: { values: 90, authenticity: 84, horizon: 52 },
    is_mock: true,
  },
  {
    id: "b-19",
    kind: "brand",
    name: "Polestar Bicycles",
    rq_code: "RQ-D2",
    rq_name: "Touring-Bike Maker",
    tags: ["cycling", "outdoor", "craft"],
    blurb: "Steel touring bikes. For people who actually go places.",
    traits: { values: 74, authenticity: 86, horizon: 82 },
    is_mock: true,
  },
  {
    id: "b-20",
    kind: "brand",
    name: "Anchor Press Studios",
    rq_code: "RQ-A1",
    rq_name: "Letterpress Printer",
    tags: ["print", "craft", "heritage"],
    blurb: "Letterpress + bookbinding. Wedding stationery + art books.",
    traits: { values: 92, authenticity: 88, horizon: 56 },
    is_mock: true,
  },
];

export const MOCK_ENTITIES: readonly MarketplaceEntity[] = [
  ...MOCK_CREATORS,
  ...MOCK_BRANDS,
];
