#!/bin/bash
# Installs or updates CropGuard on Amazon Linux 2023. Safe to re-run. Must run as root.
set -euo pipefail

REPO=${REPO:-https://github.com/vedhakoushik/cropguard.git}
BRANCH=${BRANCH:-aws-migration}
APP_USER=cropguard
APP_DIR=/opt/cropguard

detect_region() {
    local token
    token=$(curl -fsS -X PUT http://169.254.169.254/latest/api/token -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
    curl -fsS -H "X-aws-ec2-metadata-token: $token" http://169.254.169.254/latest/meta-data/placement/region
}
REGION=${AWS_REGION:-$(detect_region)}

dnf install -y git nginx python3.11 python3.11-pip postgresql16

# Code, venv and logs belong to an unprivileged service user; git and pip run as that user.
id "$APP_USER" &>/dev/null || useradd --system --home-dir "$APP_DIR" --shell /sbin/nologin "$APP_USER"
install -d -o "$APP_USER" -g "$APP_USER" "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
as_app() { runuser -u "$APP_USER" -- "$@"; }

if [ -d "$APP_DIR/.git" ]; then
    as_app git -C "$APP_DIR" fetch origin "$BRANCH"
    as_app git -C "$APP_DIR" checkout "$BRANCH"
    as_app git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
    as_app git clone -b "$BRANCH" "$REPO" "$APP_DIR"
fi

as_app python3.11 -m venv "$APP_DIR/.venv"
as_app "$APP_DIR/.venv/bin/pip" install -q --no-cache-dir --upgrade pip
as_app "$APP_DIR/.venv/bin/pip" install -q --no-cache-dir -r "$APP_DIR/backend/requirements.txt"

echo "AWS_REGION=$REGION" > /etc/cropguard.env
install -m 0644 "$APP_DIR/deploy/cropguard.service" /etc/systemd/system/cropguard.service

# Replace the distro nginx.conf (which has its own port-80 server) with ours; keep the original once.
[ -f /etc/nginx/nginx.conf.orig ] || cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.orig
install -m 0644 "$APP_DIR/deploy/nginx.conf" /etc/nginx/nginx.conf
install -m 0644 "$APP_DIR/deploy/nginx-cropguard.conf" /etc/nginx/conf.d/cropguard.conf
nginx -t

systemctl daemon-reload
systemctl enable cropguard nginx
systemctl restart cropguard nginx
echo "CropGuard deployed from branch $BRANCH in $REGION"
