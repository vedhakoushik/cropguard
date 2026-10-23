#!/bin/bash
# Installs or updates CropGuard on Amazon Linux 2023. Safe to re-run.
set -euo pipefail
export HOME=${HOME:-/root}

REPO=https://github.com/vedhakoushik/cropguard.git
BRANCH=${BRANCH:-aws-migration}
APP_DIR=/opt/cropguard

IMDS_TOKEN=$(curl -fsS -X PUT http://169.254.169.254/latest/api/token -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
REGION=$(curl -fsS -H "X-aws-ec2-metadata-token: $IMDS_TOKEN" http://169.254.169.254/latest/meta-data/placement/region)
echo "AWS_REGION=$REGION" > /etc/cropguard.env

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
# Amazon Linux ships a default port-80 server in nginx.conf; make ours the default instead.
sed -i "s/ default_server//" /etc/nginx/nginx.conf
cp "$APP_DIR/deploy/nginx-cropguard.conf" /etc/nginx/conf.d/cropguard.conf
nginx -t

systemctl daemon-reload
systemctl enable cropguard nginx
systemctl restart cropguard nginx
echo "CropGuard deployed from branch $BRANCH in $REGION"
