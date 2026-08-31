#!/bin/bash
# ========================================================
# Electrodrivers Portal — Easy SSL Activation Script
# Usage: ./scripts/setup-ssl.sh portal.electrodrivers.ru admin@electrodrivers.ru
# ========================================================

DOMAIN=${1:-portal.electrodrivers.ru}
EMAIL=${2:-admin@electrodrivers.ru}

echo "========================================================"
echo "⚡ Starting SSL Certificate setup for: $DOMAIN"
echo "📧 Notification email: $EMAIL"
echo "========================================================"

mkdir -p ./certbot/conf
mkdir -p ./certbot/www

# Step 1: Ensure Nginx is running in HTTP mode to handle ACME challenge
echo "1. Ensuring Nginx is running for ACME challenge..."
docker compose up -d nginx

# Step 2: Request SSL Certificate from Let's Encrypt
echo "2. Requesting SSL certificate from Let's Encrypt..."
docker compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
  -d $DOMAIN \
  --email $EMAIL \
  --agree-tos \
  --no-eff-email \
  --force-renewal" certbot

# Step 3: Check if certificate was issued
if [ -f "./certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
  echo "✅ Certificate verified at ./certbot/conf/live/$DOMAIN/fullchain.pem"
  
  # Step 4: Activate HTTPS Nginx config
  echo "3. Activating HTTPS configuration in Nginx..."
  sed "s/portal.electrodrivers.ru/$DOMAIN/g" nginx/default-ssl.conf > nginx/default.conf
  
  # Step 5: Restart Nginx
  echo "4. Restarting Nginx to apply SSL..."
  docker compose restart nginx
  
  echo "========================================================"
  echo "🎉 SUCCESS! Your portal is now fully secured with HTTPS:"
  echo "👉 https://$DOMAIN"
  echo "========================================================"
else
  echo "❌ ERROR: Certificate file was not created."
  echo "Please check if your domain DNS A-record ($DOMAIN) points to this server IP."
fi
