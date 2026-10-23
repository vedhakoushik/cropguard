#!/bin/bash
# Installs or updates CropGuard on Amazon Linux 2023. Safe to re-run.
set -euo pipefail

REPO=https://github.com/vedhakoushik/cropguard.git
BRANCH=${BRANCH:-aws-migration}
APP_DIR=/opt/cropguard

dnf install -y git nginx python3.11 python3.11-pip postgresql16

id cropguard &>/dev/null || useradd --system --home-dir "$APP_DIR" --shell /sbin/nologin cropguard
git config --global --add safe.directory "$APP_DIR"

if [ -d "$APP_DIR/.git" ]; then
    git -C "$APP_DIR" fetch origin "$BRANCH"
    git -C "$APP_DIR" checkout "$BRANCH"
    git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
    git clone -b "$BRANCH" "$REPO" "$APP_DIR"
fi

python3.11 -m venv "$APP_DIR/.venv"
"$APP_DIR/.venv/bin/pip" install -q --upgrade pip
"$APP_DIR/.venv/bin/pip" install -q -r "$APP_DIR/backend/requirements.txt"
chown -R cropguard:cropguard "$APP_DIR"

cp "$APP_DIR/deploy/cropguard.service" /etc/systemd/system/cropguard.service
cp "$APP_DIR/deploy/nginx-cropguard.conf" /etc/nginx/conf.d/cropguard.conf
nginx -t

systemctl daemon-reload
systemctl enable cropguard nginx
systemctl restart cropguard nginx
echo "CropGuard deployed from branch $BRANCH"
