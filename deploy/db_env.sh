# Source this to export PG* connection vars from the Secrets Manager secret.
SECRET=$(aws secretsmanager get-secret-value --secret-id "${SECRET_ID:-cropguard/prod}" \
    --region "${AWS_REGION:-us-east-1}" --query SecretString --output text)
_get() { python3 -c "import json,sys; print(json.loads(sys.argv[1])[sys.argv[2]])" "$SECRET" "$1"; }
export PGHOST=$(_get DB_HOST) PGPORT=$(_get DB_PORT) PGDATABASE=$(_get DB_NAME)
export PGUSER=$(_get DB_USER) PGPASSWORD=$(_get DB_PASSWORD) PGSSLMODE=require
unset SECRET
