#!/bin/bash
# ========================================================
# Electrodrivers Portal — Easy SSL Activation Script
# Usage: ./scripts/setup-ssl.sh <your-domain.ru> <your-email@domain.ru>
# ========================================================

DOMAIN=${1}
EMAIL=${2}

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "Usage: ./scripts/setup-ssl.sh <your-domain> <your-email>"
  echo "Example: ./scripts/setup-ssl.sh portal.electrodrivers.ru admin@electrodrivers.ru"
  exit 1
fi

echo "=== Step 1: Requesting Let's Encrypt Certificate for $DOMAIN ==="
docker compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
  -d $DOMAIN \
  --email $EMAIL \
  --agree-tos \
  --no-eff-email" certbot

if [ ! -d "./certbot/conf/live/$DOMAIN" ]; then
  echo "ERROR: Certificate was not generated. Please check DNS A-record and firewall ports (80/443)."
  exit 1
fi

echo "=== Step 2: Activating HTTPS configuration in Nginx ==="
sed "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" nginx/default-ssl.conf > nginx/default.conf

echo "=== Step 3: Reloading Nginx ==="
docker compose restart nginx

echo "=== SUCCESS! Your website is now secure at https://$DOMAIN ==="
