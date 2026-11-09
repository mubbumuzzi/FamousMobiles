# Famous Mobiles — Device Tracking & Repair Management System

A mobile-first PWA and native Android app for Famous Mobiles repair shop in Hyderabad. Digitizes repair intake, workshop diagnostics, customer WhatsApp communication, stock demands, and multi-store management.

> 📖 **Architecture & Complete Workflow Guide:** See **[APP_FLOW.md](APP_FLOW.md)** for detailed role breakdowns, state machines, business logic, entity models, and API endpoints.

---

## Tech Stack

- **Frontend:** Next.js 16+, React 19, TypeScript, TailwindCSS v4, Capacitor 8 (Android/iOS)
- **Backend:** Spring Boot 3, Java 21, Spring Security, JWT auth, RBAC
- **Database:** PostgreSQL 16 + Flyway migrations
- **Design System:** Urban Company minimal aesthetic (`#121212`, `#F7F7F8`, `#EBEBEB`, `#767676`, 12px radius, zero emojis, clean monochrome typography)
- **Deployment:** Docker Compose + Nginx reverse proxy + AWS EC2 VPS

---

## Key Modules & Features

### 1. Multi-Store Support
- Seamless branch switcher for multi-store operations:
  - **Manikonda** (Main Branch — Opp Friends Colony Bus Stop)
  - **New Famous** (Branch 2)
  - **All Stores** aggregated overview for Administrators.

### 2. Admin & Reception Dashboards (`/dashboard`)
- **Executive Metric Strip**: Real-time unified store revenue (Repairs + Counter Accessory Sales), active workshop repairs, overdue alerts, ready pickups, and intakes.
- **Unified Revenue Tracking**: "Revenue Today" and "Revenue (Month)" show total business intake with live subtitle breakdowns (`Repairs: ₹X · Sales: ₹Y`). Revenue remains strictly hidden from non-admin staff.
- **Day-End Cash & Bank Reconciliation**: Clicking "Revenue Today" opens a drilldown drawer calculating physical cash in drawer, digital UPI bank deposits, and POS card swipes across all transactions, plus an itemized ledger with `[Repair]` and `[Sale]` badges.
- **WhatsApp Day-End Closing**: 1-click generator that formats a verified daily closing message sent to the proprietor (+91 90637 86751).
- **Stock & Parts Demands Snapshot**: Compact executive radar showing pending wholesale demands, blocked workshop repairs, and 1-tap Call/WhatsApp actions without endless vertical scroll.
- **Workshop Queue**: Real-time cards with device model, reported issue snippets, assigned technician, and 1-tap customer communication.
- **Analytics & Breakdown**: Device status pie chart and top brand distribution.

### 3. Stock Demand & Sold Accessories Tracker (`/stock-orders`)
- **Top Tab Switcher**: Seamlessly toggle between **Special Stock Demands** and **Sold Accessories & Warranties**.
- **Special Demands Board**: 2-column responsive board with automated accessory tags (`Back Cover`, `Tempered Glass`, `Display`, `Battery`), 1-tap calling/WhatsApp, and wholesale order sanitizer.
- **Instant Counter Sales ("Sell Accessory & Bill")**: Counter sale intake for walk-in accessories with custom prices, payment mode (`CASH`, `UPI`, `CARD`), and configurable warranty (defaults to 0 days, up to 12 months).
- **Live Warranty Tracker**: Real-time calculation showing `In Warranty (Xd left)`, `Expired`, or `No Warranty` with quick filter pills.
- **Admin Void / Cancellation**: Admins can void mistaken sales entries with a reason, immediately deducting the amount from today's revenue, drawer, and reports.
- **Universal Search Integration**: Accessory sales and live warranty status searchable alongside repair tickets in `/search`.

### 4. Advanced Reports & Exports (`/reports`)
- **Top Tab Switcher**: Dedicated views for **Repairs & Service Log**, **Accessory Sales & Invoices**, and **Inventory Stock**.
- **Repairs Log**: Landscape tabular PDF & 14-column Excel workbook with ticket tracking tokens, device models, issue descriptions, technician assignments, and balance due.
- **Accessory Sales Reports**: Itemized register of sold accessories with date range presets (`Today`, `Yesterday`, `This Week`, `This Month`, `Last 30 Days`, `All Time`), summary KPI cards (Items Sold, Sales Revenue, Cash, UPI, Card), and 1-click **Download PDF**, **Print Preview**, and **Download Excel (.xlsx)**.
- **Live Metric Strip**: Real-time financial calculations prior to export.
- **Direct Preview & Print**: In-browser PDF preview alongside secure token-mutex downloads.

### 5. Official Digital Signature & Receipts
- **Proprietor Signature**: High-resolution cursive digital signature of **Md Basheer Uddin** rendered in fountain-pen royal blue ink with flourish underline.
- **Standardized Footer Layout**: Balanced 3-column layout on both Repair Receipts and Accessory Warranty Invoices:
  1. Terms & Conditions
  2. Digital Signature block ("For Famous Mobiles", stylized cursive signature, "Md. Basheer Uddin (Proprietor)", "✓ Digitally Signed")
  3. Store QR Code ("Scan to call shop")
- Single and duplicate receipts fit cleanly on standard A4 paper without overflow.

### 6. Universal Search (`/search`)
- **Interactive Zero-State**: Suggestion chips and format guidance cards (*Token*, *Phone Number*, *Device/IMEI*).
- **Brand-Aware Database Matching**: Eager search querying brands (`Samsung`, `iPhone`, `Vivo`), customer names, and tracking tokens.
- **Scope Filters**: Quick tabs for *All Results*, *Tickets*, *Customers*, and *Accessory Warranty*.

### 7. Customers Directory (`/customers`)
- **Responsive 2-Column Grid**: Cohesive layout with circular monogram avatars (`MU`, `SA`, `SC`).
- **Clean Location Display**: Automatic sanitization of invalid placeholder addresses with genuine `<MapPin>` locations.

### 8. Device Intake Wizard (`/tickets/new`)
- **Strict 10-Digit Mobile Matching**: Instant customer directory lookup without premature triggers.
- **Mandatory Intake Camera Photos**: Enforces 1 to 2 condition photos before intake.
- **Client-Side Image Compression**: In-browser HTML5 canvas compressor reducing multi-megabyte camera photos to ~150KB before upload.

---

## Local Development

You need **two terminals** — backend on `:8080` and frontend on `:3000`.

### 1. Configure Environment

```bash
cp .env.example .env.local   # if you don't have one yet
# Edit .env.local — set DB_USER, JWT secrets, admin password
```

Ensure PostgreSQL is running and the `famousmobiles` database exists.

### 2. Backend (Terminal 1)

```bash
./scripts/start-backend.sh          # foreground (recommended for dev)
# or
./scripts/start-backend-bg.sh       # background JAR process
```

- Health check: `./scripts/check-backend.sh` → prints `OK`
- API Root: `http://localhost:8080/api`

### 3. Frontend (Terminal 2)

```bash
cd frontend
npm install
npm run dev
```

- Staff Portal: `http://localhost:3000/login`
- Public Tracking: `http://localhost:3000/track`
- Admin credentials: `./scripts/admin-credentials.sh`

---

## Native Android App (Capacitor)

The staff application is packaged into a native Android APK using Capacitor.

### Current Build
- **File:** `FamousMobiles-staff.apk` (Root directory, 5.0 MB)
- **Package ID:** `com.famousmobiles.staff`
- **Version:** `1.3` (`versionCode: 4`)

### Build Instructions

```bash
# 1. Export static Next.js assets and sync Capacitor plugins
cd frontend
CAPACITOR_BUILD=true npm run build:cap

# 2. Assemble Android Debug APK
export JAVA_HOME="/path/to/java-21"
cd android
./gradlew assembleDebug

# 3. Copy to project root
cp app/build/outputs/apk/debug/app-debug.apk ../../FamousMobiles-staff.apk
```

---

## Testing & Quality Assurance

```bash
# Run unit and regression tests (47 tests)
cd frontend
npm test

# Type-check TypeScript codebase
npx tsc --noEmit

# Backend compilation & tests
cd ../backend
mvn test
```

---

## User Roles & Permissions

| Role | Permissions & Access Scope |
| :--- | :--- |
| **Admin** | Full system control: financial totals, technician performance, reports, user staff management, stock demands, ticket overrides. |
| **Salesman / Reception** | Device intake wizard, active repairs board, stock demand creation, customer directory, invoice printing. Revenue totals hidden. |
| **Technician** | Personal assigned repair queue, status progression, diagnosis notes, part requirement requests. |

---

## Business Information

**Famous Mobiles**  
Opp Friends Colony Bus Stop, Shaikpet Main Road  
Manikonda, Hyderabad — 500089  
📞 Contact: +91 9063786751
