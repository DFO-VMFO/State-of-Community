# Backups and recovery (works on the free Supabase plan)

The free plan has **no automatic backups**, so we make our own. Everything that must survive lives in the `soc_` tables (members, records, staff, audit log).

## What we do
| Layer | What | Who | When |
|---|---|---|---|
| 1. Automatic | GitHub workflow "Weekly backup" runs `scripts/backup.sh`, encrypts the dump and keeps it 90 days | Nobody (check it ran) | Sunday and Wednesday |
| 2. Manual | `bash scripts/backup.sh` | Ops lead | Before any schema change, and before any bulk edit |
| 3. Off-site copy | Download the latest encrypted file from the GitHub run (Actions > run > Artifacts) to the organization's drive | Ops lead | Monthly |

## One-time setup (15 minutes)
1. Put the project in a **private** GitHub repo.
2. Supabase > **Connect** > copy the **Session pooler** URI and put your database password in it. (Do not use the "Direct" URI: it is IPv6-only and fails in GitHub.)
3. GitHub repo > Settings > Secrets and variables > Actions: add `SUPABASE_DB_URL` and `BACKUP_PASSPHRASE` (pick a long phrase; save it in the password manager. **Without it the backups cannot be opened.**)
4. Actions > Weekly backup > **Run workflow** once. Confirm a green check and a downloadable artifact.
5. Do a restore drill (below).

## Restore drill (do it now, then every quarter)
1. Create a scratch Supabase project (free). Run `schema.sql` in its SQL editor.
2. `gpg -d soc-YYYYMMDD-HHMM.sql.gz.gpg | gunzip > restore.sql`
3. Remove the schema half so it does not clash, or load only data: `psql "$SCRATCH_DB_URL" -f restore.sql` (errors for objects that already exist are fine; the `COPY` data loads).
4. Sign in to a scratch copy as ops and a test member. Confirm members, dues and the audit log are there.
5. Write the drill date in the runbook. An untested backup is not a backup.

## If live data is damaged
Tell staff to stop editing, take a fresh backup of the damaged state, restore the last good file into a scratch project, and copy only the missing rows back. Never restore over live without a second person watching.

## Free-plan watch-outs
- **Projects pause after 7 days with no activity.** A paused project stops the portal. Weekly backups touch the database, which keeps it awake; also check it monthly. Upgrading removes this.
- **No point-in-time recovery**: you can lose up to 3 days of changes (backups run twice a week). If that is too much, run the workflow daily (change the cron) or upgrade later.
- **Limits:** 500 MB database. Check Supabase > Reports once a quarter.

## Not in the database dump
Supabase secrets and edge-function code (code is in the repo; secrets belong in the password manager), Stripe history (Stripe keeps it), and the files behind vault entries (only locations are stored).

## Privacy
Backups contain member data and are always encrypted before leaving the database. Share them with ops and the board only. Delete after 60 to 90 days unless the retention policy says otherwise.
