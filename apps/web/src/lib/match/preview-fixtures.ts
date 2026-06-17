/**
 * Shared X-Deck preview fixtures.
 *
 * The base `MOCK_CANDIDATES` from ./fixtures ships with picsum.photos
 * random-seed images that don't read well on a public marketing
 * surface. This module overrides those imageUrls with curated Unsplash
 * portraits and re-exports the result so any marketing-side deck
 * preview (e.g. /what-is-this, /studio landing) renders the same set.
 *
 * The original `MOCK_CANDIDATES` are NOT mutated — keep the standalone
 * /x-deck iteration surface on its previous picsum images so designers
 * can spot when a deck is the real-data demo vs the marketing preview.
 */

import { MOCK_CANDIDATES } from "./fixtures";

const PREVIEW_CANDIDATE_IMAGES: Record<string, string> = {
  // Jeremy Arche — Caucasian male portrait.
  "cand-01":
    "https://images.unsplash.com/photo-1590086782792-42dd2350140d?w=600&h=780&fit=crop&crop=faces&q=80",
  "cand-02":
    "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&h=780&fit=crop&crop=faces&q=80",
  "cand-03":
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=780&fit=crop&crop=faces&q=80",
  // Iris Tanaka — young East Asian woman, professional portrait.
  "cand-04":
    "https://images.unsplash.com/photo-1581065178047-8ee15951ede6?w=600&h=780&fit=crop&crop=faces&q=80",
  "cand-05":
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=780&fit=crop&crop=faces&q=80",
  // Priya Shankar — young Indian businesswoman in a suit.
  "cand-06":
    "https://images.unsplash.com/photo-1637589267610-6c66fc2a086b?w=600&h=780&fit=crop&crop=faces&q=80",
};

export const PREVIEW_CANDIDATES = MOCK_CANDIDATES.map((c) =>
  PREVIEW_CANDIDATE_IMAGES[c.id]
    ? { ...c, imageUrl: PREVIEW_CANDIDATE_IMAGES[c.id] }
    : c,
);
