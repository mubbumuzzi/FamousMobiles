# Famous Mobiles — Device Tracking & Repair Management System

A mobile-first PWA for Famous Mobiles repair shop in Hyderabad. Digitizes paper-based repair booking with courier-style device tracking.

## Stack

- **Frontend:** Next.js 15+, React, TypeScript, TailwindCSS, PWA
- **Backend:** Spring Boot 3, Java 21, JWT auth, RBAC
- **Database:** PostgreSQL 16 + Flyway migrations
- **Deployment:** Docker Compose + Nginx reverse proxy

## Deployment (Production Server)

See **[DEPLOY.md](DEPLOY.md)** for full server deployment instructions.

Quick version on your VPS:

```bash
git clone https://github.com/mubbumuzzi/FamousMobiles.git
cd FamousMobiles
cp .env.production.example .env
nano .env   # set domain, secrets, passwords
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

## Quick Start (Docker — local)

```bash
cp .env.example .env
docker compose up --build
```

Open:
- **Staff app:** http://localhost (login required)
- **Public tracking:** http://localhost/track

Default admin credentials (change in production):
- Email: `admin@famousmobiles.com`
- Password: `Admin@123`

## Local Development

You need **two terminals** — backend on `:8080` and frontend on `:3000`.

### 1. Configure environment

```bash
cp .env.example .env.local   # if you don't have one yet
# Edit .env.local — set DB_USER, JWT secrets, admin password
```

Ensure PostgreSQL is running and the `famousmobiles` database exists.

### 2. Backend (terminal 1 — keep open)

```bash
./scripts/start-backend.sh          # foreground (recommended for dev)
# or
./scripts/start-backend-bg.sh       # background JAR process
```

Verify: `./scripts/check-backend.sh` → should print `OK`

API: http://localhost:8080/api

### 3. Frontend (terminal 2)

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:3000/login

Admin credentials: `./scripts/admin-credentials.sh`

### Troubleshooting

| Error | Fix |
|-------|-----|
| `Cannot reach the server at http://localhost:8080/api` | Backend not running — start terminal 1 above |
| Login fails after backend restart | Use mobile `9000000000` (not email); password from `.env.local` |
| Port 8080 busy | `./scripts/stop-backend.sh` then restart |

## Features

- Repair ticket creation with auto tracking numbers (`FM-2026-000001`)
- 8-stage repair lifecycle with append-only audit trail
- Public tracking portal (no login) by tracking ID or mobile
- Amazon-style visual tracking timeline
- PDF receipts with QR codes
- Customer, technician, inventory, and payment management
- Dashboard with repair metrics and revenue charts
- Reports export (PDF/Excel)
- Notification event log (WhatsApp/SMS ready)
- PWA: installable, offline fallback, standalone mode

## Project Structure

```
FamousMobiles/
├── frontend/          # Next.js PWA
├── backend/           # Spring Boot REST API
├── nginx/             # Reverse proxy config
├── data/uploads/      # Device photos & PDF receipts
├── docker-compose.yml
└── .env.example
```

## User Roles

| Role | Access |
|------|--------|
| Admin | Full system access |
| Reception | Tickets, customers, payments |
| Technician | Assigned jobs, status updates |

## Business Address (Receipts)

Famous Mobiles  
Opp Friends Colony Bus Stop, Shaikpet Main Road  
Manikonda, Hyderabad
