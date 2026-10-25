# Famous Mobiles — Application Flow & Architecture Guide

> **Purpose:** This document is the single source of truth for the **Famous Mobiles Device Tracking & Repair Management System**. Whenever you or an AI assistant need to make changes, refer to this guide to understand the complete application flow, business rules, entity models, API endpoints, and frontend routes at a glance.

---

## 1. Quick Brief (30-Second Summary)

- **What it is:** A mobile-first Progressive Web App (PWA) & backend tracking system for *Famous Mobiles* repair shop (Shaikpet Main Road, Manikonda, Hyderabad; Owner: Basheer Uddin).
- **Core Problem Solved:** Digitizes paper job sheets into courier/Amazon-style package tracking (`FM-YYYY-NNNNNN`), multi-mobile customer management, technician job tracking, automated balance calculation, and PDF receipts with QR codes.
- **Tech Stack:**
  - **Frontend:** Next.js 15+ (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, PWA (Service Worker + Offline Fallback).
  - **Backend:** Spring Boot 3, Java 21, Spring Security (Stateless JWT + Refresh Tokens), JPA / Hibernate (`open-in-view: false`), Flyway migrations.
  - **Database:** PostgreSQL 16.
  - **Storage & Reports:** Local disk uploads (`./data/uploads`), OpenPDF (iText) for PDF receipts & reports, ZXing for QR codes, Apache POI for Excel reports.
  - **Deployment:** Docker Compose, Nginx reverse proxy, Certbot SSL, systemd background scripts.

---

## 2. System Architecture

```
                    ┌───────────────────────────────────────────────┐
                    │               CLIENT DEVICES                  │
                    │  - Shop Counter (Desktop / Tablet / Mobile)   │
                    │  - Technicians (Mobile / Workstation)         │
                    │  - Customers (Smartphones / QR code scan)     │
                    └──────────────────────┬────────────────────────┘
                                           │
                                           │ HTTP/HTTPS (:80 / :443)
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            NGINX REVERSE PROXY                                   │
│  - Routes /api/* & /uploads/*  ───► Spring Boot Backend (:8080)                  │
│  - Routes /*                   ───► Next.js Frontend (:3000)                     │
└──────────────────────┬───────────────────────────────────┬───────────────────────┘
                       │                                   │
                       ▼                                   ▼
┌──────────────────────────────────────────┐   ┌───────────────────────────────────┐
│        NEXT.JS FRONTEND (:3000)          │   │     SPRING BOOT API (:8080)       │
│  - App Router (/app)                     │   │  - REST Controllers               │
│  - Role-based Layouts & Dashboards       │   │  - Security & JWT Auth Filter     │
│  - 5-Step Intake Wizard                  │   │  - Business Services Layer        │
│  - Dual Repair Views (Cards / Kanban)    │   │  - OpenPDF + ZXing Receipt Engine │
│  - Public Tracking Portal (/track)       │   │  - Notification Dispatcher (Logs) │
│  - PWA Offline Support & Push Hooks      │   │  - Flyway Database Migrations     │
└──────────────────────────────────────────┘   └─────────────────┬─────────────────┘
                                                                 │
                                                                 ▼
                                               ┌───────────────────────────────────┐
                                               │      POSTGRESQL 16 DATABASE       │
                                               │  - Users, Customers & Phones      │
                                               │  - Tickets, Photos, Payments      │
                                               │  - Status History (Audit Trail)   │
                                               │  - Inventory & Notifications      │
                                               └───────────────────────────────────┘
```

---

## 3. User Roles & Access Control (RBAC)

The system uses phone-number-based authentication (`mobile` + `password`).

| Feature / Action | Admin | Salesman (Reception) | Technician | Public Customer (No Auth) |
| :--- | :---: | :---: | :---: | :---: |
| **Login Credential** | Mobile (`9000000000`) | Staff Mobile | Staff Mobile | None |
| **Dashboard** | Revenue KPIs, Repairs breakdown, Financial charts | Intake counts, Active repairs, Pending delivery | Active assigned jobs, Quick status updater | Tracking Search only |
| **Create Repair Ticket** | Yes | Yes (5-Step Wizard) | Yes (Auto-assigned) | No |
| **Edit Ticket Info** | Yes | Yes | Limited | No |
| **Assign Technician** | Yes (Any technician) | No | Self-assign only (`/assign-me`)| No |
| **Update Estimation** | Yes | Yes | Yes | No |
| **Record Payments** | Yes | Yes | **Forbidden (403)** | No |
| **View Revenue / Financials**| Yes | **Hidden** | **Hidden** | No |
| **Customer Management** | Full CRUD | Create / Lookup / Edit | View linked customer only | No |
| **Staff & Tech Management** | Full CRUD (`/staff`) | No | No | No |
| **Reports (PDF / Excel)** | Yes (`/reports`) | No | No | No |
| **Print / Share Receipt** | Yes | Yes | No | Download own receipt |
| **Public Status Tracking** | Yes | Yes | Yes | Yes (Masked IMEI) |

---

## 4. Database Schema & Data Models

All primary keys use `UUID` generated via `gen_random_uuid()`. Timestamps are `TIMESTAMPTZ` with `NOW()`.

```
 customers                         customer_phones
 ┌──────────────────────┐          ┌──────────────────────┐
 │ id (UUID, PK)        │ 1      N │ id (UUID, PK)        │
 │ customer_code (UK)   │──────────│ customer_id (FK)     │
 │ full_name (>= 4 chr) │          │ mobile (UK, 10-dig)  │
 │ address, area, city  │          │ label (e.g. Primary) │
 │ notes                │          │ is_primary (BOOLEAN) │
 └──────────┬───────────┘          └──────────────────────┘
            │ 1
            │
            │ N
 repair_tickets
 ┌────────────────────────────────────────────────────────┐
 │ id (UUID, PK)                                          │
 │ tracking_number (UK, e.g. FM-2026-000001)              │
 │ customer_id (FK -> customers)                          │
 │ assigned_technician_id (FK -> technicians, nullable)   │
 │ created_by_id (FK -> users, nullable)                  │
 │ status (RepairStatus Enum)                             │
 │ device_type (MOBILE, TABLET, SMART_WATCH, etc.)        │
 │ brand, model, color, imei                              │
 │ accessories_received (JSONB: ["Charger", "SIM", ...])  │
 │ device_condition (JSONB: ["Screen Cracked", ...])      │
 │ problem_description (TEXT)                             │
 │ estimated_cost (DECIMAL, default 0)                    │
 │ advance_paid (DECIMAL, default 0)                      │
 │ balance_amount (DECIMAL, auto-computed: cost - advance)│
 │ estimated_delivery_date (DATE)                         │
 │ delivered_at (TIMESTAMPTZ, nullable)                   │
 │ warranty_days (INTEGER, default 0, V7 migration)       │
 └──────┬──────────────┬──────────────┬──────────────┬────┘
        │ 1            │ 1            │ 1            │ 1
        │ N            │ N            │ N            │ N
        ▼              ▼              ▼              ▼
 ticket_status_history payments    device_photos  ticket_notes
 ┌──────────────────┐  ┌────────┐  ┌───────────┐  ┌───────────┐
 │ id (PK)          │  │ id(PK) │  │ id (PK)   │  │ id (PK)   │
 │ ticket_id (FK)   │  │ amount │  │ photo_type│  │ author_id │
 │ from_status      │  │ mode   │  │ file_path │  │ content   │
 │ to_status        │  │ user_id│  │ user_id   │  └───────────┘
 │ remarks          │  └────────┘  └───────────┘
 │ technician_notes │
 └──────────────────┘
```

### Enumerations
- **`RepairStatus`**:
  `DEVICE_RECEIVED` ➔ `UNDER_DIAGNOSIS` ➔ `WAITING_FOR_APPROVAL` ➔ `WAITING_FOR_PARTS` ➔ `REPAIR_IN_PROGRESS` ➔ `QUALITY_CHECK` ➔ `READY_FOR_PICKUP` ➔ `DELIVERED` | `RETURNED_UNREPAIRED`
- **`DeviceType`**: `MOBILE`, `TABLET`, `SMART_WATCH`, `LAPTOP`, `OTHER`
- **`PaymentMode`**: `CASH`, `UPI`, `CARD`
- **`PhotoType`**: `FRONT`, `BACK`, `DAMAGE`, `REPAIR`
- **`UserRole`**: `ADMIN`, `SALESMAN`, `TECHNICIAN`
- **`SkillLevel`**: `JUNIOR`, `INTERMEDIATE`, `SENIOR`, `EXPERT`

---

## 5. End-to-End Business Flows

### Flow 1: Device Intake & Ticket Creation (5-Step Wizard)
**URL:** `/tickets/new`

```
  [Step 1: Customer]
  ├── Enter 10-digit mobile number
  ├── System auto-checks exact match via /api/customers/lookup?mobile=...
  │     ├── MATCH FOUND: Auto-populates customer & displays past repair history
  │     └── NEW CUSTOMER: Inline form for Name (>= 4 chars), Address, Area
  └── Option: Clone previous device model/brand from customer's repair history

  [Step 2: Device Details]
  ├── Select Device Type (Default: Mobile)
  ├── Brand quick chips (Samsung, Apple, Xiaomi, Vivo, Oppo, OnePlus, Realme, etc.)
  ├── Model, Color, IMEI / Serial
  ├── Check accessories left by customer: Battery, SIM Card, Charger, Memory Card, Box...
  └── Check pre-existing condition: Screen Cracked, Water Damage, Touch Not Working...

  [Step 3: Issue Description]
  ├── Quick problem templates (Screen cracked, Battery draining, Charging port, etc.)
  └── Detailed problem description notes

  [Step 4: Cost & Delivery]
  ├── Estimated repair cost (₹) OR toggle "Quote after diagnosis" (sets ₹0)
  ├── Advance payment collected (₹) -> calculates Balance Amount: (Cost - Advance)
  └── Estimated Delivery Date (EDD) picker

  [Step 5: Review & Confirm]
  ├── Live summary bill preview with shop terms
  ├── Click "Create Ticket"
  │     ├── Backend generates tracking number: FM-YYYY-NNNNNN
  │     ├── Initial status set to DEVICE_RECEIVED
  │     ├── Immutable history logged
  │     └── Notification queued in notification_logs
  └── Success Screen:
        ├── Direct link to Print A4/A5 PDF receipt
        ├── Direct button to share tracking link on WhatsApp
        └── Redirect to ticket detail page
```

---

### Flow 2: Repair Lifecycle & Status Transitions
**URL:** `/tickets/[id]` or Kanban board at `/tickets`

```
 [DEVICE_RECEIVED] ──► [UNDER_DIAGNOSIS] ──► [WAITING_FOR_APPROVAL] ──► [WAITING_FOR_PARTS]
        │                      │                        │                        │
        │                      │                        │                        │
        ▼                      ▼                        ▼                        ▼
 [RETURNED_UNREPAIRED]  ◄──────┴────────────────────────┴────────────────────────┘
        ▲
        │
 [REPAIR_IN_PROGRESS] ──► [QUALITY_CHECK] ──► [READY_FOR_PICKUP] ──► [DELIVERED]
```

#### Strict Business Rules & Guardrails
1. **No Delivery With Outstanding Balance:**
   `TicketService.java` enforces: If `status == DELIVERED` and `balanceAmount > 0`, the backend throws `400 Bad Request`. Salesman/Admin must record payment before handing the device to the customer.
2. **Technician Payment Lockdown:**
   Technicians cannot record payments (`403 Forbidden`). Only `ADMIN` or `SALESMAN` can record transactions.
3. **Estimation Updates:**
   - Costs can be updated anytime during diagnosis or approval via `PATCH /api/tickets/{id}/estimation`.
   - Cannot update estimation once ticket is `DELIVERED` or `RETURNED_UNREPAIRED`.
   - Every price change appends an audit record to status history with old cost, new cost, and new balance.
4. **Returned Unrepaired Logic:**
   - If a customer rejects an estimate or device is unfixable, transitioning to `RETURNED_UNREPAIRED` sets `estimated_cost = 0`, `balance_amount = 0`, records advance refunded in timeline, and marks device delivered.
5. **Technician Self-Assignment:**
   - Technicians can self-assign unassigned tickets with 1-click (`POST /api/tickets/{id}/assign-me`).
   - Admins can reassign any ticket to any technician.

---

### Flow 3: Billing & Payments Flow
**URL:** `/tickets/[id]`

```
  [Staff records payment]
  ├── Amount: ₹X.XX
  ├── Payment Mode: CASH | UPI | CARD
  └── Optional transaction notes
               │
               ▼
  [Backend: PaymentService.java]
  ├── Inserts row in `payments` table
  ├── Increments `ticket.advance_paid` by ₹X
  ├── Decrements `ticket.balance_amount` = (estimated_cost - total_paid)
  └── Persists updated ticket
               │
               ▼
  [Balance == 0 ?]
  ├── YES: Delivery unblocked -> "Mark as Delivered" button enabled
  └── NO: Ticket displays amber badge: "Pending Balance: ₹X"
```

---

### Flow 4: Public Customer Tracking Portal
**URL:** `/track` and `/track/[trackingId]`

1. **Zero Login Required:** Customers scan the QR code on the receipt or click the WhatsApp link.
2. **Dual Search Modes:**
   - By Tracking Number (e.g. `FM-2026-000001`).
   - By 10-digit Customer Mobile Number (returns single view or list of all repairs).
3. **Privacy & Security:**
   - IMEI numbers are masked on public view (e.g. `•••• •••• •••• 5678`).
   - Customer addresses and internal technician notes are stripped.
4. **Interactive Timeline:**
   - Amazon-style progress tracker showing 5 key customer-facing milestones:
     1. Device Received
     2. Diagnosis & Approval
     3. Repair in Progress
     4. Ready for Pickup
     5. Delivered
   - Live balance amount, repair notes, and direct button to download PDF receipt.

---

### Flow 5: PDF Receipt & QR Code Engine
**Service:** `PdfReceiptService.java`
**URL:** `/api/tickets/{id}/receipt/pdf` & `/api/public/track/{trackingNumber}/receipt/pdf`

- **Format:** A4 page layout with compact margins where the top half is an exact **A5 voucher** (suitable for thermal printers, mini printers, or A4 cut-in-half).
- **Contents:**
  - Shop Branding: *Famous Mobiles*, Manikonda, Hyderabad (Ph: 9063786751).
  - Tracking ID & Date.
  - Customer info: Name, Primary Mobile, Customer Code.
  - Device info: Type, Brand, Model, Color, IMEI, Physical condition tags, Accessories.
  - Problem reported.
  - Financials: Total Estimated Cost, Advance Paid, Balance Due.
  - Dynamic **ZXing QR Code**: Encodes public URL `https://famousmobiles.in/track/FM-YYYY-NNNNNN`.
  - Terms & Conditions (2-month collection disclaimer, receipt presentation clause).

---

## 6. Frontend Navigation & Page Directory

All routes reside in `frontend/src/app`:

| Route | Component / File | Purpose & Role Access |
| :--- | :--- | :--- |
| `/login` | `login/page.tsx` | Mobile + Password auth. Redirects to `/dashboard`. |
| `/dashboard` | `dashboard/page.tsx` | Role-aware container. Loads `AdminDashboard`, `ReceptionDashboard`, or `TechnicianHome`. |
| `/tickets` | `tickets/TicketsPageContent.tsx` | Repairs list. Toggle between **Cards view** and **Kanban Board** (`RepairKanban.tsx`). Filter by status. |
| `/tickets/new` | `tickets/new/page.tsx` | 5-step intake wizard. Customer lookup, device details, issue, pricing, preview. |
| `/tickets/[id]` | `tickets/[id]/page.tsx` | Main command center for an individual ticket: status transitions, payments, timeline, photos, WhatsApp share, PDF receipt. |
| `/customers` | `customers/page.tsx` | Customer list, search by name/mobile, quick customer registration. |
| `/customers/[id]` | `customers/[id]/page.tsx` | Customer profile, multi-mobile numbers manager (`MobileListEditor.tsx`), past repair history. |
| `/search` | `search/page.tsx` | Unified search across tickets (by ID, IMEI, brand, model) and customers (by name, mobile). |
| `/staff` | `staff/page.tsx` | **Admin Only.** Create/edit staff users and set roles (`SALESMAN`, `TECHNICIAN`). |
| `/reports` | `reports/page.tsx` | **Admin Only.** Export Repairs & Inventory reports to PDF or Excel. |
| `/track` | `track/page.tsx` | Public search page by Tracking ID or Mobile. |
| `/track/[trackingId]` | `track/[trackingId]/page.tsx` | Public customer tracking page with masked data and progress timeline. |
| `/offline` | `offline/page.tsx` | PWA offline fallback screen when network is unavailable. |

---

## 7. Backend API Reference

Base URL: `http://localhost:8080/api` (Production: `/api`)

### Authentication (`/api/auth`)
- `POST /api/auth/login` — `{ mobile, password }` ➔ Returns `{ accessToken, refreshToken, fullName, role, ... }`
- `POST /api/auth/refresh` — `{ refreshToken }` ➔ Returns new access & refresh tokens
- `POST /api/auth/logout` — Revokes refresh token in DB

### Tickets (`/api/tickets`)
- `GET /api/tickets` — List all tickets (ordered by newest first)
- `GET /api/tickets/{id}` — Get ticket detail with customer & technician relations
- `POST /api/tickets` — Create new ticket (generates `FM-YYYY-NNNNNN`)
- `PUT /api/tickets/{id}` — Update device details, accessories, conditions
- `PATCH /api/tickets/{id}/status` — `{ status, remarks, technicianNotes }` (transitions status & logs history)
- `PATCH /api/tickets/{id}/estimation` — `{ estimatedCost, remarks }` (updates cost & recalculates balance)
- `POST /api/tickets/{id}/assign` — `{ technicianId }` (**Admin only**)
- `POST /api/tickets/{id}/assign-me` — Self-assign ticket (**Technician only**)
- `GET /api/tickets/{id}/timeline` — Get chronological status changes + notes
- `POST /api/tickets/{id}/notes` — `{ content }` (adds internal note)
- `GET /api/tickets/{id}/photos` — List uploaded photos
- `POST /api/tickets/{id}/photos` — Multipart upload (`file`, `photoType`)
- `GET /api/tickets/{id}/receipt/pdf` — Stream generated PDF receipt

### Payments (`/api`)
- `POST /api/tickets/{id}/payments` — `{ amount, paymentMode, notes }` (**Admin / Salesman only**)
- `GET /api/tickets/{id}/payments` — List payments for a ticket
- `GET /api/payments/outstanding` — List all tickets with `balanceAmount > 0`
- `GET /api/payments/today` — Itemized payments for today with Cash, UPI, and Card reconciliation breakdown (**Admin only**)

### Customers (`/api/customers`)
- `GET /api/customers` — List or search customers (`?q=...`)
- `GET /api/customers/lookup?mobile=...` — Exact 10-digit mobile lookup (checks all phone numbers)
- `GET /api/customers/{id}` — Get customer profile with all phone numbers
- `POST /api/customers` — Create customer (`fullName >= 4 chars`, unique mobile)
- `PUT /api/customers/{id}` — Update customer profile and phone list
- `GET /api/customers/{id}/repairs` — Get customer repair history

### Public Tracking (`/api/public/track` — No Auth)
- `GET /api/public/track/{trackingNumber}` — Get public tracking details with masked IMEI
- `GET /api/public/track?mobile=...` — Look up repairs by customer mobile
- `GET /api/public/track/{trackingNumber}/receipt/pdf` — Download public receipt

### Staff & Users (`/api/users` — Admin Only)
- `GET /api/users` — List staff
- `POST /api/users` — Create staff user (`ADMIN`, `SALESMAN`, `TECHNICIAN`)
- `PUT /api/users/{id}` — Update staff details
- `DELETE /api/users/{id}` — Delete staff (foreign keys set to NULL to preserve audit history)

### Reports (`/api/reports` — Admin Only)
- `GET /api/reports/repairs?from=...&to=...&format=pdf|excel` — Export repair records
- `GET /api/reports/inventory?format=pdf|excel` — Export spare parts inventory

### Technicians & Dashboard (`/api`)
- `GET /api/technicians` — List active technicians
- `GET /api/dashboard/metrics` — Dashboard counts & revenue (revenue hidden for non-admin)
- `GET /api/search?q=...` — Unified search across tickets and customers

---

## 8. Developer Playbook: How to Make Changes

When asked for changes in future sessions, follow these exact patterns:

### 1. Adding a New Repair Status
1. Add constant to `RepairStatus.java` (Backend enum).
2. Adjust `canTransitionTo()` in `RepairStatus.java` if transition rules apply.
3. Update `RepairStatus` union type in `frontend/src/lib/types.ts`.
4. Update `REPAIR_STATUSES` array in `types.ts`.
5. Update `formatStatus()` and color badge in `frontend/src/lib/utils.ts`.
6. Add column mapping in `frontend/src/lib/kanban-columns.ts`.
7. Update notification mapping in `NotificationTemplateService.java` if an alert is needed.

### 2. Adding a Field to Repair Tickets
1. **Database:** Add a new Flyway migration `V7__add_your_field.sql` in `backend/src/main/resources/db/migration/`.
2. **Entity:** Add property to `RepairTicket.java` with getters/setters.
3. **DTO:** Update `TicketDto.java` (`CreateTicketRequest`, `UpdateTicketRequest`, `TicketResponse`).
4. **Service:** Update `TicketService.java` (`create`, `update`, `applyDeviceDetails`).
5. **Frontend Types:** Add property to `Ticket` interface in `frontend/src/lib/types.ts`.
6. **UI:** Add input in `frontend/src/app/tickets/new/page.tsx` and render in `frontend/src/app/tickets/[id]/page.tsx`.

### 3. Modifying Receipt Layout or Shop Info
1. Edit `backend/src/main/resources/application.yml` under `app.shop` (or override via `.env.local` / environment variables).
2. For frontend displays, edit `frontend/src/lib/shop.ts`.
3. To alter PDF fonts, tables, or layout, modify `PdfReceiptService.java`.

### 4. Integrating Real SMS / WhatsApp Service
1. Currently, messages are logged to `notification_logs` via `NotificationService.java` and dispatched by `NoOpNotificationDispatcher.java`.
2. To send live WhatsApp/SMS:
   - Create `TwilioNotificationDispatcher.java` or `GupshupNotificationDispatcher.java` implementing `NotificationDispatcher`.
   - Annotate with `@Primary` or `@ConditionalOnProperty("app.notifications.enabled")`.
   - Inject API credentials into `application.yml`.

### 5. Running & Testing Locally
- **Start Backend:** `./scripts/start-backend.sh` (or `./scripts/start-backend-bg.sh`)
- **Check Backend:** `./scripts/check-backend.sh`
- **Start Frontend:** `cd frontend && npm run dev`
- **Automated Smoke Test:** `./scripts/test-local.sh`
- **Default Admin:** Mobile `9000000000`, Password in `.env.local` or `Admin@123`.
