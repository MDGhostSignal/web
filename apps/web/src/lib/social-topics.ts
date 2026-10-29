/**
 * Five branded social topics. Two posts a week (Tuesday and Thursday)
 * walk this list in order. Stored on social_posts.notes as the topic id
 * so the existing scheduler schema does not need a new column.
 * Headline lives in title. Image suggestion lives in body.
 */

export const SOCIAL_TOPICS = [
  { id: "inspirational", label: "Inspirational", color: "#D66157" },
  { id: "educational", label: "Educational", color: "#7A3045" },
  { id: "snow-drift", label: "Snow Drift", color: "#00B29C" },
  { id: "community", label: "Community", color: "#FBAD25" },
  { id: "roster", label: "Roster", color: "#5B4B8A" },
] as const;

export type SocialTopicId = (typeof SOCIAL_TOPICS)[number]["id"];

export type SocialTopic = (typeof SOCIAL_TOPICS)[number];

/** Body placeholder when a tile has no image suggestion yet. */
export const EMPTY_IMAGE_SUGGESTION = "—";

const TOPIC_IDS = new Set<string>(SOCIAL_TOPICS.map((t) => t.id));

/** Tuesday 6 Jan 2026 — slot 0 of the cycle. */
const CYCLE_EPOCH = new Date(2026, 0, 6);

export function topicById(id: string | null | undefined): SocialTopic | null {
  if (!id || !TOPIC_IDS.has(id)) return null;
  return SOCIAL_TOPICS.find((t) => t.id === id) ?? null;
}

export function topicFromNotes(notes: string | null | undefined): SocialTopic | null {
  return topicById(notes?.trim() ?? "");
}

export function imageSuggestionText(body: string | null | undefined): string {
  const text = (body ?? "").trim();
  if (!text || text === EMPTY_IMAGE_SUGGESTION) return "";
  return text;
}

/**
 * Tuesday and Thursday dates inside the calendar month of `anchor`,
 * at 09:00 local. These are the two weekly slots.
 */
export function cadenceDaysInMonth(anchor: Date): Date[] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const out: Date[] = [];
  const cursor = new Date(year, month, 1, 9, 0, 0, 0);
  while (cursor.getMonth() === month) {
    const day = cursor.getDay();
    if (day === 2 || day === 4) out.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/** Stable topic for a Tuesday or Thursday, continuing across months. */
export function topicForCadenceDay(day: Date): SocialTopic {
  const start = new Date(CYCLE_EPOCH);
  start.setHours(0, 0, 0, 0);
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - start.getTime()) / 86_400_000);
  const weeks = Math.floor(diffDays / 7);
  const dow = ((diffDays % 7) + 7) % 7;
  const slot = weeks * 2 + (dow >= 2 ? 1 : 0);
  const index = ((slot % SOCIAL_TOPICS.length) + SOCIAL_TOPICS.length) % SOCIAL_TOPICS.length;
  return SOCIAL_TOPICS[index];
}
