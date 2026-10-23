#!/bin/bash
# Loads schema and seed data into RDS using credentials from Secrets Manager. Run once.
set -euo pipefail
source "$(dirname "$0")/db_env.sh"

DIR=$(cd "$(dirname "$0")/../db" && pwd)
for f in 01_schema.sql 02_seed_crops_pests.sql 03_seed_location_data.sql; do
    psql -q -v ON_ERROR_STOP=1 -f "$DIR/$f" > /dev/null
    echo "loaded $f"
done
psql -c "\dt"
