#!/bin/bash
# Loads schema and seed data into RDS using credentials from Secrets Manager. Run once.
set -euo pipefail

SECRET=$(aws secretsmanager get-secret-value --secret-id "${SECRET_ID:-cropguard/prod}" \
    --region "${AWS_REGION:-us-east-1}" --query SecretString --output text)
get() { python3 -c "import json,sys; print(json.loads(sys.argv[1])[sys.argv[2]])" "$SECRET" "$1"; }

export PGHOST=$(get DB_HOST) PGPORT=$(get DB_PORT) PGDATABASE=$(get DB_NAME)
export PGUSER=$(get DB_USER) PGPASSWORD=$(get DB_PASSWORD) PGSSLMODE=require

DIR=$(cd "$(dirname "$0")/../db" && pwd)
for f in 01_schema.sql 02_seed_crops_pests.sql 03_seed_location_data.sql; do
    psql -q -v ON_ERROR_STOP=1 -f "$DIR/$f" > /dev/null
    echo "loaded $f"
done
psql -c "\dt"
