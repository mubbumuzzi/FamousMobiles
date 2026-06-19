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

### Backend

```bash
# Start PostgreSQL (or use Docker for postgres only)
docker compose up postgres -d

cd backend
export DB_URL=jdbc:postgresql://localhost:5432/famousmobiles
export DB_USER=famousmobiles
export DB_PASSWORD=famousmobiles
mvn spring-boot:run
```

API runs at http://localhost:8080

### Frontend

```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8080/api npm run dev
```

App runs at http://localhost:3000

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
