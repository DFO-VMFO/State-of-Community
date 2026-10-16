#!/usr/bin/env bash
# Backs up every soc_ table to a dated, compressed file. Works on the free Supabase plan.
# Usage:  SUPABASE_DB_URL='<session pooler URI>' [BACKUP_PASSPHRASE='...'] bash scripts/backup.sh [outdir]
#   URI: Supabase > Connect > Session pooler (works over IPv4, which GitHub and most laptops need).
#   With BACKUP_PASSPHRASE the file is encrypted (.gpg). Always set it for anything stored off your machine.
# Restore:  see docs/BACKUPS.md (restore into a scratch project first).
set -euo pipefail
: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL (Supabase > Connect > Session pooler)}"
out="${1:-backups}"; mkdir -p "$out"; base="$out/soc-$(date -u +%Y%m%d-%H%M)"
pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges --table='public.soc_*' > "$base.sql"
grep -q 'COPY public.soc_records' "$base.sql" || { echo "Backup looks empty: $base.sql" >&2; rm -f "$base.sql"; exit 1; }
rows=$(awk '/^COPY public.soc_records/{f=1;next}/^\\\./{f=0}f' "$base.sql" | wc -l)
gzip -f "$base.sql"; f="$base.sql.gz"
if [ -n "${BACKUP_PASSPHRASE:-}" ]; then gpg --batch --yes --pinentry-mode loopback --passphrase "$BACKUP_PASSPHRASE" -c "$f" && rm -f "$f" && f="$f.gpg"; fi
echo "Wrote $f ($(du -h "$f" | cut -f1), $rows records)"
find "$out" -name 'soc-*' -mtime +60 -delete
