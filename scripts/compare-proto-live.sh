#!/usr/bin/env bash
# Vergleicht Proto (138.199.167.214) und Live (83.228.246.191) Laravel-Backend.
# Findet Unterschiede in: PHP-Files (Hash), DB-Schema, Triggers, Migrations, .env-Keys.
#
# Nutzung (lokal, mit SSH-Key auf root@beide-Server):
#   ./scripts/compare-proto-live.sh           # Quick (Hash + Migrations + Schema)
#   ./scripts/compare-proto-live.sh full      # + Trigger-Sourcen + Indices
#
# Output:  /tmp/derm-diff/   (proto.*, live.*, diff.*)

set -u
PROTO=root@138.199.167.214
LIVE=root@83.228.246.191
APP=/home/ubuntu/derm-api
OUT=/tmp/derm-diff
MODE="${1:-quick}"

mkdir -p "$OUT"
echo "==> Output: $OUT"
echo "==> Mode:   $MODE"
echo

# ---------- 1) Migrations ----------
echo "==> Migrations (Datei-Liste)"
ssh "$PROTO" "ls $APP/database/migrations 2>/dev/null | sort" > "$OUT/proto.migrations.txt"
ssh "$LIVE"  "ls $APP/database/migrations 2>/dev/null | sort" > "$OUT/live.migrations.txt"
diff -u "$OUT/proto.migrations.txt" "$OUT/live.migrations.txt" > "$OUT/diff.migrations.txt" \
  && echo "    OK (identisch)" || echo "    !! Diff: $OUT/diff.migrations.txt"

echo
echo "==> Ausgeführte Migrationen (DB-Tabelle migrations)"
SQL_MIG="SELECT migration FROM migrations ORDER BY migration;"
ssh "$PROTO" "cd $APP && php artisan db --no-interaction 2>/dev/null; sqlite3 $APP/database/database.sqlite \"$SQL_MIG\"" > "$OUT/proto.migrations_db.txt" 2>/dev/null
ssh "$LIVE"  "sqlite3 $APP/database/database.sqlite \"$SQL_MIG\"" > "$OUT/live.migrations_db.txt" 2>/dev/null
diff -u "$OUT/proto.migrations_db.txt" "$OUT/live.migrations_db.txt" > "$OUT/diff.migrations_db.txt" \
  && echo "    OK (identisch)" || echo "    !! Diff: $OUT/diff.migrations_db.txt"

# ---------- 2) DB-Schema (alle Tabellen + CREATE-Statements) ----------
echo
echo "==> DB-Schema (CREATE TABLE / INDEX / TRIGGER)"
SQL_SCHEMA="SELECT type||' '||name||': '||sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY type, name;"
ssh "$PROTO" "sqlite3 $APP/database/database.sqlite \"$SQL_SCHEMA\"" > "$OUT/proto.schema.txt"
ssh "$LIVE"  "sqlite3 $APP/database/database.sqlite \"$SQL_SCHEMA\"" > "$OUT/live.schema.txt"
diff -u "$OUT/proto.schema.txt" "$OUT/live.schema.txt" > "$OUT/diff.schema.txt" \
  && echo "    OK (identisch)" || echo "    !! Diff: $OUT/diff.schema.txt"

# ---------- 3) Zone-relevante Tabellen einzeln ----------
echo
echo "==> Zone-relevante Tabellen (Spalten)"
for T in spots spot_locations overview_pins images locations; do
  ssh "$PROTO" "sqlite3 $APP/database/database.sqlite \"PRAGMA table_info($T);\"" > "$OUT/proto.cols.$T.txt" 2>/dev/null
  ssh "$LIVE"  "sqlite3 $APP/database/database.sqlite \"PRAGMA table_info($T);\"" > "$OUT/live.cols.$T.txt" 2>/dev/null
  if diff -q "$OUT/proto.cols.$T.txt" "$OUT/live.cols.$T.txt" > /dev/null 2>&1; then
    echo "    $T: OK"
  else
    echo "    $T: !! diff in $OUT/diff.cols.$T.txt"
    diff -u "$OUT/proto.cols.$T.txt" "$OUT/live.cols.$T.txt" > "$OUT/diff.cols.$T.txt"
  fi
done

# ---------- 4) PHP-Code-Hashes (app/ + routes/ + config/) ----------
echo
echo "==> Code-Hashes (app/ routes/ config/)"
HASH_CMD="cd $APP && find app routes config -type f -name '*.php' -print0 | sort -z | xargs -0 sha256sum"
ssh "$PROTO" "$HASH_CMD" > "$OUT/proto.hashes.txt"
ssh "$LIVE"  "$HASH_CMD" > "$OUT/live.hashes.txt"
# Nur Dateiname+Hash vergleichen (Pfade identisch)
diff -u "$OUT/proto.hashes.txt" "$OUT/live.hashes.txt" > "$OUT/diff.hashes.txt" \
  && echo "    OK (identisch)" || {
    N=$(grep -c '^[+-][^+-]' "$OUT/diff.hashes.txt")
    echo "    !! $N Zeilen Diff: $OUT/diff.hashes.txt"
    echo "    Geänderte Dateien:"
    grep -E '^[+-][^+-]' "$OUT/diff.hashes.txt" | awk '{print $2}' | sort -u | sed 's/^/      /'
  }

# ---------- 5) VERSION + Git ----------
echo
echo "==> VERSION / Git"
for S in "$PROTO" "$LIVE"; do
  L=$(basename "$S" | tr '.' '_')
  ssh "$S" "echo VERSION=\$(cat $APP/VERSION 2>/dev/null); echo GIT=\$(cd $APP && git rev-parse HEAD 2>/dev/null); echo BRANCH=\$(cd $APP && git rev-parse --abbrev-ref HEAD 2>/dev/null)" > "$OUT/info.$L.txt"
  echo "    $S:"
  sed 's/^/      /' "$OUT/info.$L.txt"
done

# ---------- 6) .env Keys (nur Keys, keine Werte!) ----------
echo
echo "==> .env Keys (Werte werden NICHT geloggt)"
ssh "$PROTO" "grep -E '^[A-Z]' $APP/.env 2>/dev/null | cut -d= -f1 | sort" > "$OUT/proto.envkeys.txt"
ssh "$LIVE"  "grep -E '^[A-Z]' $APP/.env 2>/dev/null | cut -d= -f1 | sort" > "$OUT/live.envkeys.txt"
diff -u "$OUT/proto.envkeys.txt" "$OUT/live.envkeys.txt" > "$OUT/diff.envkeys.txt" \
  && echo "    OK (Keys identisch)" || echo "    !! Diff: $OUT/diff.envkeys.txt"

# ---------- 7) Full-Mode: Trigger-Quellcode ----------
if [ "$MODE" = "full" ]; then
  echo
  echo "==> [full] Trigger-Sourcen"
  SQL_TRIG="SELECT name||': '||sql FROM sqlite_master WHERE type='trigger' ORDER BY name;"
  ssh "$PROTO" "sqlite3 $APP/database/database.sqlite \"$SQL_TRIG\"" > "$OUT/proto.triggers.txt"
  ssh "$LIVE"  "sqlite3 $APP/database/database.sqlite \"$SQL_TRIG\"" > "$OUT/live.triggers.txt"
  diff -u "$OUT/proto.triggers.txt" "$OUT/live.triggers.txt" > "$OUT/diff.triggers.txt" \
    && echo "    OK" || echo "    !! Diff: $OUT/diff.triggers.txt"
fi

echo
echo "==> FERTIG."
echo "    Schau zuerst rein:  ls -la $OUT/diff.*"
echo "    Wichtigste Files:"
echo "      $OUT/diff.schema.txt      (DB-Struktur)"
echo "      $OUT/diff.migrations_db.txt (welche Migration fehlt live?)"
echo "      $OUT/diff.cols.spots.txt  (Spalten von spots/zonen)"
echo "      $OUT/diff.hashes.txt      (Code-Unterschiede)"
