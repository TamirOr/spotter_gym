#!/usr/bin/env bash
# Runs every supabase/tests/test_*.sql against a fresh database built from the migrations.
# Needs Postgres 15+ with pg_trgm. Connection comes from the standard PG* environment variables.
set -euo pipefail
shopt -s nullglob

here="$(cd "$(dirname "$0")" && pwd)"
db="spotter_test_$$"
psql_db=(psql --quiet --no-psqlrc -v ON_ERROR_STOP=1 --dbname "$db")

createdb "$db"
trap 'dropdb --if-exists "$db"' EXIT

"${psql_db[@]}" -f "$here/supabase_stub.sql" > /dev/null
for migration in "$here"/../migrations/*.sql; do
  "${psql_db[@]}" -f "$migration" > /dev/null
done
"${psql_db[@]}" -f "$here/helpers.sql" > /dev/null

failed=0
for test_file in "$here"/test_*.sql; do
  name="$(basename "$test_file")"
  if output="$("${psql_db[@]}" -f "$test_file" 2>&1)"; then
    echo "ok   $name"
  else
    echo "FAIL $name"
    echo "$output" | grep -E 'ERROR|FAILED' | sed 's/^/     /'
    failed=1
  fi
done
exit "$failed"
