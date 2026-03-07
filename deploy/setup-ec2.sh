#!/usr/bin/env bash
#
# BuchiFin EC2 one-shot setup script (Ubuntu 24.04 LTS)
# Run: chmod +x setup-ec2.sh && sudo bash setup-ec2.sh
# Edit the CONFIG block below before first run.
#
set -e

# =============================================================================
# CONFIG – edit these before running
# Note: DB_PASSWORD should not contain $ or single quotes (heredoc expansion).
# =============================================================================
REPO_URL="https://<USERNAME>:<TOKEN>@github.com/oggagan/agro.git"
APP_DIR="/var/www/buchifin"
DB_NAME="buchifin"
DB_USER="buchifin"
DB_PASSWORD="<strong_password>"
NODE_VERSION="24"
SERVER_NAME="_"
BACKEND_PORT="5000"
ACCESS_TOKEN_SECRET=""
REFRESH_TOKEN_SECRET=""
SUPER_ADMIN_PHONE="9999999999"
SUPER_ADMIN_PASSWORD="SuperAdmin@123"
APP_USER="ubuntu"
# =============================================================================

# Auto-generate JWT secrets if not set
if [ -z "$ACCESS_TOKEN_SECRET" ]; then
  ACCESS_TOKEN_SECRET=$(openssl rand -hex 32)
fi
if [ -z "$REFRESH_TOKEN_SECRET" ]; then
  REFRESH_TOKEN_SECRET=$(openssl rand -hex 32)
fi

echo "[1/10] Installing system packages..."
apt-get update -qq && apt-get upgrade -y -qq
apt-get install -y -qq curl git build-essential

echo "[2/10] Installing and configuring PostgreSQL 17..."
apt-get install -y -qq postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
  sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true

echo "[3/10] Installing NVM and Node.js $NODE_VERSION LTS..."
export NVM_DIR="/home/$APP_USER/.nvm"
sudo -u "$APP_USER" bash -c '
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  nvm install '"$NODE_VERSION"'
  nvm alias default '"$NODE_VERSION"'
  npm install -g pm2
'

echo "[4/10] Cloning repository..."
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR" && sudo -u "$APP_USER" git pull
  cd - > /dev/null
else
  mkdir -p "$APP_DIR"
  chown "$APP_USER":"$APP_USER" "$APP_DIR"
  sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR"
fi

echo "[5/10] Creating backend .env..."
# Write .env as root then chown (avoids quoting issues in subshell)
cat > "$APP_DIR/backend/.env" << ENVEOF
PORT=$BACKEND_PORT
NODE_ENV=production
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME
ACCESS_TOKEN_SECRET=$ACCESS_TOKEN_SECRET
REFRESH_TOKEN_SECRET=$REFRESH_TOKEN_SECRET
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
SYSTEM_USER_ID=00000000-0000-0000-0000-000000000000
SUPER_ADMIN_PHONE=$SUPER_ADMIN_PHONE
SUPER_ADMIN_PASSWORD=$SUPER_ADMIN_PASSWORD
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
ENVEOF
chown "$APP_USER":"$APP_USER" "$APP_DIR/backend/.env"

echo "[6/10] Building backend..."
sudo -u "$APP_USER" bash -c '
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  cd '"$APP_DIR"'/backend
  npm ci
  mkdir -p uploads
  npx prisma generate
  npx prisma migrate deploy
  npm run build
'

echo "[7/10] Building frontend..."
sudo -u "$APP_USER" bash -c '
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  cd '"$APP_DIR"'/frontend
  npm ci
  npm run build
'

echo "[8/10] Starting backend with PM2..."
sudo -u "$APP_USER" bash -c '
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  cd '"$APP_DIR"'/backend
  pm2 delete buchifin-api 2>/dev/null || true
  pm2 start dist/server.js --name buchifin-api
  pm2 save
'

# PM2 startup script (run at boot) – must run as root with PATH to node/pm2
NODE_VER=$(sudo -u "$APP_USER" bash -c 'export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"; node -v')
export PATH="/home/$APP_USER/.nvm/versions/node/$NODE_VER/bin:$PATH"
pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" 2>/dev/null || true
sudo -u "$APP_USER" bash -c '
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  pm2 save
'

echo "[9/10] Configuring Nginx..."
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
rm -f /etc/nginx/conf.d/default.conf 2>/dev/null || true

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cp "$SCRIPT_DIR/buchifin.conf" /etc/nginx/conf.d/buchifin.conf
sed -i "s|SERVER_NAME_PLACEHOLDER|$SERVER_NAME|g" /etc/nginx/conf.d/buchifin.conf
sed -i "s|ROOT_PLACEHOLDER|$APP_DIR/frontend/dist|g" /etc/nginx/conf.d/buchifin.conf
sed -i "s|BACKEND_PORT_PLACEHOLDER|$BACKEND_PORT|g" /etc/nginx/conf.d/buchifin.conf

nginx -t && systemctl reload nginx

echo "[10/10] Done."
echo ""
echo "=============================================="
echo "  BuchiFin deployment summary"
echo "=============================================="
echo "  App root:     $APP_DIR"
echo "  Frontend:     $APP_DIR/frontend/dist"
echo "  Backend:      http://127.0.0.1:$BACKEND_PORT (PM2: buchifin-api)"
echo "  Nginx:        /etc/nginx/conf.d/buchifin.conf"
echo "  Server name:  $SERVER_NAME"
echo "=============================================="
PUB_IP=$(curl -s --connect-timeout 1 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || true)
echo "  Open in browser: http://${PUB_IP:-<EC2-public-IP>}"
echo "  Or use your EC2 public IP / domain if set."
echo ""
echo "  Useful commands:"
echo "    pm2 status              (as $APP_USER)"
echo "    pm2 logs buchifin-api   (as $APP_USER)"
echo "    sudo systemctl status nginx"
echo ""
echo "  Optional – HTTPS with Let's Encrypt:"
echo "    sudo apt install -y certbot python3-certbot-nginx"
echo "    sudo certbot --nginx -d your-domain.com"
echo "=============================================="
