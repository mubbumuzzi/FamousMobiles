# Deploy Famous Mobiles to Your Server

This guide assumes an **Ubuntu 22.04+ / Debian** VPS with SSH access.

## Requirements

- 2 GB RAM minimum (4 GB recommended)
- Docker + Docker Compose installed
- Domain pointed to your server IP (optional but recommended for HTTPS)

---

## Step 1 — Install Docker on the server

SSH into your server, then run:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Log out and back in so the `docker` group applies.

---

## Step 2 — Clone the project

```bash
cd ~
git clone https://github.com/mubbumuzzi/FamousMobiles.git
cd FamousMobiles
```

---

## Step 3 — Configure production environment

```bash
cp .env.production.example .env
nano .env
```

**Replace these values:**

| Variable | Example |
|----------|---------|
| `PUBLIC_APP_URL` | `https://app.famousmobiles.com` or `http://YOUR_SERVER_IP` |
| `NEXT_PUBLIC_API_URL` | `https://app.famousmobiles.com/api` |
| `CORS_ORIGINS` | `https://app.famousmobiles.com` |
| `DB_PASSWORD` | strong random password |
| `JWT_SECRET` | `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | `openssl rand -base64 48` |
| `ADMIN_PASSWORD` | strong admin password |

Generate secrets on the server:

```bash
openssl rand -base64 48   # run twice for JWT secrets
```

---

## Step 4 — Deploy

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

Or manually:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

---

## Step 5 — Open the app

Famous Mobiles runs on **port 8080** by default (port 80 is reserved for other apps).

| URL | Purpose |
|-----|---------|
| `http://YOUR_SERVER_IP:8080` | Staff login |
| `http://YOUR_SERVER_IP:8080/track` | Public device tracking |

Default login (change immediately after first login):
- Mobile: value of `ADMIN_MOBILE` in `.env` (default `9000000000`)
- Password: value of `ADMIN_PASSWORD` in `.env`

---

## Step 6 — HTTPS with Let's Encrypt (recommended)

**Prerequisite:** Domain `app.famousmobiles.com` A-record → your server IP.

```bash
# Install certbot
sudo apt update && sudo apt install -y certbot

# Stop nginx briefly to get certificate
docker compose stop nginx

sudo certbot certonly --standalone -d app.famousmobiles.com

# Copy certs for Docker nginx (adjust domain if different)
sudo mkdir -p certbot/conf certbot/www
sudo cp -rL /etc/letsencrypt/live/app.famousmobiles.com certbot/conf/live/
sudo cp -rL /etc/letsencrypt/archive/app.famousmobiles.com certbot/conf/archive/
```

Update `docker-compose.prod.yml` nginx volumes:

```yaml
nginx:
  volumes:
    - ./nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro
    - ./certbot/conf:/etc/letsencrypt:ro
    - ./certbot/www:/var/www/certbot:ro
```

Uncomment the SSL lines in `nginx/nginx.prod.conf`, then redeploy:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Renewal (add to crontab):

```bash
0 3 * * * certbot renew --quiet && docker compose -f ~/FamousMobiles/docker-compose.yml restart nginx
```

---

## Useful commands

```bash
# View logs
docker compose logs -f

# View backend logs only
docker compose logs -f backend

# Restart after .env change (frontend needs rebuild if NEXT_PUBLIC_API_URL changed)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Stop everything
docker compose down

# Backup database
docker compose exec postgres pg_dump -U famousmobiles famousmobiles > backup.sql
```

---

## Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 8080/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Can't reach site | Check `ufw` / cloud firewall allows ports 80, 443 |
| API errors in browser | Ensure `NEXT_PUBLIC_API_URL` matches your domain + `/api`, then rebuild |
| Backend won't start | Check logs: `docker compose logs backend` — usually DB not ready yet, wait 30s |
| Login fails | Verify `ADMIN_PASSWORD` in `.env` matches what you're typing |
