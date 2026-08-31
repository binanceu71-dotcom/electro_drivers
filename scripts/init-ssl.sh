#!/bin/bash
# ========================================================
# Electrodrivers Portal — SSL Initialization Script
# Usage: ./scripts/init-ssl.sh <your-domain.ru> <your-email@domain.ru>
# ========================================================

DOMAIN=${1:-portal.electrodrivers.ru}
EMAIL=${2:-admin@electrodrivers.ru}
RSA_KEY_SIZE=4096
DATA_PATH="./certbot/conf"

echo "=== Initializing SSL for domain: $DOMAIN ==="

mkdir -p "$DATA_PATH/live/$DOMAIN"
mkdir -p "./certbot/www"

if [ -f "$DATA_PATH/live/$DOMAIN/fullchain.pem" ]; then
  echo "Existing certificate found for $DOMAIN."
else
  echo "### Step 1: Creating temporary bootstrap certificate..."
  openssl req -x509 -nodes -newkey rsa:$RSA_KEY_SIZE -days 1 \
    -keyout "$DATA_PATH/live/$DOMAIN/privkey.pem" \
    -out "$DATA_PATH/live/$DOMAIN/fullchain.pem" \
    -subj "/CN=localhost"
  echo "Temporary bootstrap certificate created."
fi

echo "### Step 2: Starting Nginx..."
docker compose up -d nginx

echo "### Step 3: Requesting real Let's Encrypt SSL certificate..."
docker compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
  -d $DOMAIN \
  --email $EMAIL \
  --rsa-key-size $RSA_KEY_SIZE \
  --agree-tos \
  --force-renewal \
  --non-interactive" certbot

echo "### Step 4: Reloading Nginx with new certificate..."
docker compose exec nginx nginx -s reload

echo "=== SSL Setup Completed Successfully for https://$DOMAIN ==="
