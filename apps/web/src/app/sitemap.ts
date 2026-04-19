import type { MetadataRoute } from "next";

function getSiteUrl() {
  // In production, set NEXT_PUBLIC_SITE_URL to the canonical origin.
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/**
 * Public pages crawlers should see. Internal tools (/design-tasks,
 * /design-system, /rq-dashboard) are intentionally omitted — they have
 * no indexing value and expose admin surface area.
 */
const PUBLIC_ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/what-is-this", priority: 0.9, changeFrequency: "monthly" },
  { path: "/for-creators", priority: 0.9, changeFrequency: "monthly" },
  { path: "/for-advertisers", priority: 0.9, changeFrequency: "monthly" },
  { path: "/who-are-we", priority: 0.8, changeFrequency: "monthly" },
  { path: "/snowdrift", priority: 0.7, changeFrequency: "weekly" },
  { path: "/rq-quiz", priority: 0.8, changeFrequency: "monthly" },
  { path: "/get-in-touch", priority: 0.7, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const lastModified = new Date();

  return PUBLIC_ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: path === "/" ? base : `${base}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
