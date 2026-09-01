/**
 * Bare hosts (`www.tektones.com`, `plusplususa.com`) used as hrefs
 * resolve against the current path (`/admin/...`). Prefix https://
 * unless a scheme or protocol-relative // is already present.
 */
export function websiteHref(raw: string): string {
  const v = raw.trim();
  if (!v) return v;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v) || v.startsWith("//")) return v;
  return `https://${v}`;
}
