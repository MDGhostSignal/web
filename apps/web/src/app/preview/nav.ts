import { navLinks } from "@/lib/nav";

const previewHrefs: Record<string, string> = {
  "/what-is-this": "/preview/what-is-this",
  "/for-creators": "/preview/creators-hero",
  "/for-advertisers": "/preview/advertisers-hero",
};

export const previewNavLinks = navLinks.map((link) => {
  const href = previewHrefs[link.href];
  return href ? { ...link, href } : link;
});
