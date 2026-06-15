# Pre-migration backup + restore runbook

Before any destructive Supabase migration that touches identity data
(`members`, `xq_submissions`, `rq_submissions`, `art19_*`), capture
a local backup with the snapshot script in this repo.

## Local backup (always required)

A complete local copy of every identity-touching table. Owned by us,
independent of Supabase's uptime, restorable via a script we
control. Works on every Supabase plan including free.

### Capture a snapshot

```bash
cd apps/web
node scripts/snapshot-pre-migration.mjs --label=before-studio
```

Output lands in `backups/pre-migration-{ISO-timestamp}-{label}/`:

- `manifest.json` — table list + row counts
- `{table}.json` — lossless dump per table (the restore source)
- `{table}.csv` — same data as CSV for opening in Excel / Sheets /
  Numbers (inspection only — JSONB and array columns are
  stringified)
- `RESTORE.md` — auto-generated restore command for this snapshot

The `backups/` directory is gitignored (PII).

### Restore a single table

```bash
node scripts/restore-from-snapshot.mjs \
  --dir=pre-migration-2026-06-15T15-30-00-before-studio \
  --table=members
```

The restore script:
1. Refuses to run if `SUPABASE_URL` doesn't match the snapshot's
   project (won't accidentally cross-pollinate).
2. Prints what's about to be deleted + reinserted.
3. Asks for `yes` confirmation twice.
4. `DELETE FROM <table> WHERE id IS NOT NULL` then inserts every row
   from the JSON, in batches of 500.

### Restore everything

```bash
node scripts/restore-from-snapshot.mjs \
  --dir=pre-migration-2026-06-15T15-30-00-before-studio \
  --all
```

Same two confirmations. Runs each table in the order from the
manifest. Stops on the first error so you can investigate (the
already-restored tables keep their restored state).

## Optional: Supabase dashboard backup (paid plans only)

If you're on Supabase's paid tier, take an additional dashboard
backup from **Database → Backups** in the project console before
running the migration. That gives a server-side point-in-time floor
on top of the local JSON copy. **Not required for safety** — the
local snapshot is a complete restorable copy on its own — but it
doesn't hurt.

If you're on the free tier, ignore this section. The local snapshot
is your backup.

## Convention going forward

For every migration that's destructive or touches identity data:

1. Take a snapshot with a `--label` that names what you're about to
   do.
2. Note the snapshot dir in the PR description / session log.
3. Keep the snapshot locally for at least 30 days after the
   migration ships.
4. Delete (or archive elsewhere) once you're confident the
   migration is stable.
