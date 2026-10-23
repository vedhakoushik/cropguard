#!/bin/bash
# Opens psql against RDS, or runs one query: db_shell.sh "SELECT count(*) FROM crops;"
set -euo pipefail
source "$(dirname "$0")/db_env.sh"
if [ $# -gt 0 ]; then psql -c "$1"; else psql; fi
