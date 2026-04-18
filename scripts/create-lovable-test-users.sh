#!/bin/bash
# ============================================================================
#  create-lovable-test-users.sh
# ----------------------------------------------------------------------------
#  Legt 2 geschützte Test-User für Lovable-Automation in der Firma 'techassist'
#  an (Admin + regulärer User), beide mit is_protected=1 und ohne 2FA.
#
#  Diese User dienen Lovable dazu, Frontend-Änderungen automatisiert
#  gegen den Live-Server zu testen, ohne den Inhaber jedes Mal nach
#  Credentials fragen zu müssen.
#
#  Ausführen auf dem Live-Server (83.228.246.191):
#    cd /var/www/derm247-api
#    sudo -u www-data bash scripts/create-lovable-test-users.sh
#
#  Vorher Backup:
#    cp /var/www/derm247-api/database/database.sqlite \
#       ~/backups/database.sqlite.$(date +%Y%m%d-%H%M%S).pre-lovable-users
# ============================================================================

set -euo pipefail

API_DIR="/var/www/derm247-api"
cd "$API_DIR"

# --- Eingabe der Credentials (interaktiv, NICHT im Script hinterlegen) ----
read -r -p "Admin-Email     : " ADMIN_EMAIL
read -r -s -p "Admin-Passwort  : " ADMIN_PW; echo
read -r -p "User-Email      : " USER_EMAIL
read -r -s -p "User-Passwort   : " USER_PW; echo

# --- Hashes via Laravel/Bcrypt erzeugen ----------------------------------
ADMIN_HASH=$(php artisan tinker --execute="echo bcrypt('$ADMIN_PW');")
USER_HASH=$(php artisan tinker --execute="echo bcrypt('$USER_PW');")

# --- techassist company_id ermitteln -------------------------------------
TECH_ID=$(sqlite3 database/database.sqlite \
  "SELECT id FROM companies WHERE LOWER(name)='techassist' LIMIT 1;")

if [ -z "$TECH_ID" ]; then
  echo "FEHLER: Firma 'techassist' nicht gefunden." >&2
  exit 1
fi
echo "Firma 'techassist' gefunden: id=$TECH_ID"

# --- Upsert beider User --------------------------------------------------
sqlite3 database/database.sqlite <<SQL
-- Admin
INSERT INTO users (name, email, password, role, company_id, is_protected, created_at, updated_at)
VALUES ('Lovable Admin', '$ADMIN_EMAIL', '$ADMIN_HASH', 'admin', $TECH_ID, 1, datetime('now'), datetime('now'))
ON CONFLICT(email) DO UPDATE SET
  password=excluded.password,
  role='admin',
  company_id=$TECH_ID,
  is_protected=1,
  two_factor_secret=NULL,
  two_factor_confirmed_at=NULL,
  suspended_at=NULL,
  updated_at=datetime('now');

-- Regulärer User
INSERT INTO users (name, email, password, role, company_id, is_protected, created_at, updated_at)
VALUES ('Lovable User', '$USER_EMAIL', '$USER_HASH', 'user', $TECH_ID, 1, datetime('now'), datetime('now'))
ON CONFLICT(email) DO UPDATE SET
  password=excluded.password,
  role='user',
  company_id=$TECH_ID,
  is_protected=1,
  two_factor_secret=NULL,
  two_factor_confirmed_at=NULL,
  suspended_at=NULL,
  updated_at=datetime('now');
SQL

echo
echo "Fertig. Verifikation:"
sqlite3 -header -column database/database.sqlite \
  "SELECT id, name, email, role, company_id, is_protected,
          CASE WHEN two_factor_confirmed_at IS NULL THEN 'no' ELSE 'yes' END AS twofa
   FROM users WHERE email IN ('$ADMIN_EMAIL','$USER_EMAIL');"
