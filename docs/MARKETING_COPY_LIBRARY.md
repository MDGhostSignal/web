# Marketing Copy Library — Runbook

`/admin/marketing` → **Copy** sub-tab. A searchable, taggable catalog of every canonical headline, tagline, value-prop, CTA, social hook, glossary anchor, and long-form paragraph the brand uses. Click any entry, hit **Copy**, paste wherever you're writing.

Seeded once from the public website + the social-post packs (`social_media_posts.md`, `improved_social_posts_pack.txt`, `ghost_signal_all_social_posts_pack.txt`). Fully editable in the admin afterwards.

## Architecture at a glance

```
/admin/marketing → Copy tab
        │
        │ fetch /api/admin/marketing-copy?…
        ▼
┌─────────────────────────────────────┐
│ Supabase                            │
│   copy_snippets                     │
│   (text, kind, persona, tags,       │
│    source, favorite, timestamps)    │
└─────────────────────────────────────┘
```

The library is small (≤ 1000 entries realistically). The dashboard fetches the whole list in one round-trip and filters client-side for instant response. PostgREST query params (`?kind=&persona=&tag=&search=&favorite=`) are supported for ad-hoc curl usage.

## Initial setup (one-time)

1. **Apply the schema.** In the Supabase SQL editor, run `docs/MARKETING_COPY_LIBRARY_SCHEMA.sql`. Choose **Enable RLS** at the prompt — the SQL also enables it explicitly. No policies are intended; service-role key bypasses, anon / authenticated keys are blocked.
2. **Seed the library:**
   ```bash
   cd apps/web
   node scripts/seed-copy-snippets.mjs --dry-run   # preview only
   node scripts/seed-copy-snippets.mjs             # live
   ```
   Idempotent: re-runs skip entries whose (kind, text) pair already exists.
3. **Visit `/admin/marketing`**, click **Copy**. Filter, copy, edit, favorite.

## Taxonomy

### `kind` (enum)

| Kind | Use for |
|---|---|
| `tagline` | One-liners that anchor the brand. "This is the signal. Everything else is static." |
| `headline` | Top-of-page H1 claims. Persona-specific. |
| `subhead` | Section openers, mid-page subtitles. |
| `value_prop` | "We do X for Y" claims, feature descriptions. |
| `cta` | Button text and link copy. |
| `social_hook` | Ready-to-paste post starters from the social packs. Tag with the platform (`instagram`, `linkedin`, `x`, `substack`). |
| `long_form` | Paragraphs worth quoting in decks, proposals, about pages. |
| `glossary` | Defined terms (Signal Sheet entries) for explainer copy. |

### `persona` (enum)

`creators` / `advertisers` / `both` — useful when a phrase is targeted vs. cross-cutting.

### `tags` (free-form)

Channel hints (`instagram`, `facebook`, `linkedin`, `x`, `substack`), format hints (`hook`, `story`, `thread`, `pull-quote`, `headline`), anchor flag (`anchor` marks our top-tier rallying phrases).

## Editing workflow

- **Add snippet** button in the section toolbar → modal form (text, kind, persona, source, tags, favorite).
- Click any card text → opens the same form pre-populated in edit mode + with a Delete button.
- Click the ★ icon → optimistic favorite toggle (with rollback on API failure).
- Filters: search, kind dropdown, persona dropdown, "favorites only" checkbox. All client-side.

## Failure modes

- **Snippet doesn't appear after creating** — check the browser console for the API response. Typical: a malformed `kind` value (must be one of the enum literals). The route returns a 400 with the exact error.
- **Copy button doesn't paste anything** — usually because the browser denied clipboard access (insecure context, e.g. `http://` instead of `https://`/`localhost`). The wrapper in `lib/clipboard.ts` falls back to `document.execCommand("copy")`; if even that fails, check browser permissions.
- **Seed fails with `SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing`** — verify `apps/web/.env.local` has both values. Same env vars used by every other admin feature.

## Files

| Path | Purpose |
|---|---|
| `apps/web/src/lib/copy-snippets-types.ts` | DTOs + enum labels + arrays |
| `apps/web/src/lib/clipboard.ts` | `copyText` wrapper (clipboard API + fallback) |
| `apps/web/src/app/api/admin/marketing-copy/route.ts` | GET list + POST create |
| `apps/web/src/app/api/admin/marketing-copy/[id]/route.ts` | GET / PATCH / DELETE |
| `apps/web/src/app/admin/marketing/sections/CopySection.tsx` | Section composition (data + filters + modals) |
| `apps/web/src/app/admin/marketing/components/copy/*` | Card / list / form / filters |
| `apps/web/scripts/seed-copy-snippets.mjs` | One-shot seed |
| `docs/MARKETING_COPY_LIBRARY_SCHEMA.sql` | Schema source of truth |
