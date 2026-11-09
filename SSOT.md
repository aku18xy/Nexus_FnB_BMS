# Nexus FnB Business Management System (Malaysia Edition)
## Single Source of Truth (SSOT) & Master Project Specification

**Document Version:** 1.0.0  
**Status:** Approved Master Baseline  
**Target Environment:** 100% Vercel Serverless Cloud + In-Store Offline-First PWA  
**Jurisdiction:** Malaysia (LHDN, JKDM, BNM, JAKIM, KKM, PBT)  
**Repository:** [https://github.com/aku18xy/Nexus_FnB_BMS.git](https://github.com/aku18xy/Nexus_FnB_BMS.git)

---

## 1. Executive Project Charter

### 1.1 Purpose & Vision
**Nexus FnB BMS** is an in-house proprietary enterprise Business Management System engineered specifically for a Malaysian Food & Beverage (F&B) chain operating two distinct outlet formats:
1. **Full-Service Restaurants (FSR)**: Seated dining, interactive visual table layouts, open guest tabs, course firing, bill splitting, and multi-station kitchen routing.
2. **Quick-Service Kiosks (QSR)**: High-speed counter ordering (<15s throughput), pay-first settlement, sequential token queue calling (#101, #102), and takeaway packaging fees.

### 1.2 Core Strategic Mandates
* **Zero Third-Party SaaS POS Lock-In**: Eliminate monthly per-terminal fees, proprietary hardware lock-ins, and fragmented aggregator tablets.
* **100% Malaysian Statutory Compliance**: Native, embedded compliance with **LHDN MyInvois e-Invoicing**, **6% SST**, **10% Service Charge**, **Bank Negara 5-sen rounding**, **JAKIM Halal ingredient tracking**, and **KKM Typhoid records**.
* **100% Vercel Cloud Infrastructure**: Final production runs strictly on Vercel's managed ecosystem (Next.js 15, Neon Serverless Postgres, Vercel Blob, Vercel Cron, Upstash Redis). No AWS EC2, GCP compute instances, or dedicated Linux VPS servers.
* **Zero-Downtime Offline Resilience**: In-store operations continue uninterrupted during local ISP (Unifi / Maxis) fiber disruptions via browser-level IndexedDB caching and direct local ESC/POS hardware printing.

---

## 2. Dual Operational Profiles: FSR vs. QSR

The system provides two configurable operational modes driven by a central outlet setting:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Unified Cloud HQ & Data Model                     │
│        (Next.js 15 + Neon Postgres + LHDN Engine + Recipe BOM)         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
┌───────────────────────────────────┐ ┌───────────────────────────────────┐
│     Full-Service Restaurant (FSR) │ │     Quick-Service Kiosk (QSR)     │
├───────────────────────────────────┤ ├───────────────────────────────────┤
│ • Interactive Table Grid Map      │ │ • High-Throughput Rapid Tap POS   │
│ • Post-Pay Tab Lifecycle          │ │ • Pay-First Settlement Workflow   │
│ • Split Bill (By Seat / By Item)  │ │ • Sequential Token Queue (#101..) │
│ • 10% Service Charge + 6% SST     │ │ • 0% Service Charge + 6% SST      │
│ • Multi-station Kitchen Routing   │ │ • Compact Single/Dual Ticket Print│
│ • Waiter Handheld & Dine-in QR    │ │ • Takeaway Packaging Surcharges   │
└───────────────────────────────────┘ └───────────────────────────────────┘
```

### Detailed Operational Comparison
| Functional Area | Full-Service Restaurant (FSR) | Quick-Service Kiosk (QSR) |
| :--- | :--- | :--- |
| **Order Flow** | Table Seated $\rightarrow$ Multi-Round Orders $\rightarrow$ Post-Pay | Rapid Tap $\rightarrow$ Immediate Pre-Pay $\rightarrow$ Order Queue |
| **Table Management** | Visual floor grid (Indoor, Outdoor, VIP) with status colors | Disabled (Direct counter queue token) |
| **Token System** | Table number identified | Sequential daily token (`#101`–`#999`) with Calling Screen |
| **Service Charge** | Configurable **10% Service Charge** (taxable under SST) | **0% Service Charge** |
| **Tax Calculation** | $\text{Subtotal} + 10\% \text{ SC} + 6\% \text{ SST}$ (cascading) | $\text{Subtotal} + 6\% \text{ SST}$ |
| **Kitchen Routing** | Separate printers for Hot Wok, Cold Larder, Drink Bar | Single receipt + kitchen ticket or compact KDS |
| **Hardware Setup** | Counter POS + Waiter Handhelds (Sunmi V2s) + LAN Printers | All-in-One Touch POS (Sunmi D2s / iMin) + CFD Display |

---

## 3. Malaysian Regulatory & Statutory Engine

### 3.1 LHDN MyInvois e-Invoicing
In accordance with the Inland Revenue Board of Malaysia (IRBM / LHDN) mandate:
* **B2C Consolidated e-Invoicing**:
  * Everyday retail dine-in and kiosk orders without customer TIN are aggregated by the cloud worker.
  * Submitted as a consolidated batch via LHDN MyInvois API within **7 calendar days** following the end of each calendar month.
* **B2B / Tax-Deductible e-Invoicing**:
  * Cashier inputs customer’s **Tax Identification Number (TIN)**, Business Registration Number (BRN) or NRIC, and Buyer Name.
  * System executes real-time validation against the LHDN API, retrieves the validated UUID, and embeds the official **LHDN Verification QR Code** directly on the printed 80mm thermal receipt.

### 3.2 Sales and Service Tax (SST) & Service Charge
* **Cascading Formula for FSR**:
  $$\text{Service Charge} = \text{Discounted Subtotal} \times 10\%$$
  $$\text{Taxable Base} = \text{Discounted Subtotal} + \text{Service Charge}$$
  $$\text{Service Tax (SST)} = \text{Taxable Base} \times 6\%$$
  $$\text{Gross Total} = \text{Taxable Base} + \text{Service Tax}$$
* **Formula for QSR**:
  $$\text{Service Tax (SST)} = \text{Discounted Subtotal} \times 6\%$$
  $$\text{Gross Total} = \text{Discounted Subtotal} + \text{Service Tax} + \text{Packaging Fee}$$

### 3.3 Bank Negara Malaysia (BNM) 5-Sen Cash Rounding
Rounding applies **strictly to CASH payments**. Digital payments (DuitNow QR, E-Wallets, Cards) must always be charged the exact sen amount:
* Ending in 1, 2 cents $\rightarrow$ Round down to **0 cents**
* Ending in 3, 4 cents $\rightarrow$ Round up to **5 cents**
* Ending in 6, 7 cents $\rightarrow$ Round down to **5 cents**
* Ending in 8, 9 cents $\rightarrow$ Round up to **10 cents**
* The rounding variance is recorded in a distinct general ledger account (`rounding_adjustment`).

### 3.4 JAKIM Halal Supply Traceability
* Master registry tracking all raw food ingredients, suppliers, and certifying Islamic bodies (JAKIM, MUIS, CICOT, etc.).
* Automated escalation triggers at **60 days** and **30 days** before any supplier Halal certificate expires.
* Audit trail logging all batch purchase orders against certified Halal vendors.

### 3.5 KKM & Local Council (PBT) Health Compliance
* Registry of all kitchen and service personnel tracking compulsory **3-year Typhoid Injections (*Suntikan Tifoid*)** and **Food Handler Training (*Latihan Pengendali Makanan*)**.
* Council inspection-ready PDF export for DBKL, MBPJ, MBSJ, and other municipal authorities.

---

## 4. System Architecture (100% Vercel Serverless)

```
                               ┌────────────────────────────────────────────────────────┐
                               │             100% VERCEL PRODUCTION CLOUD               │
                               │                                                        │
                               │  ┌──────────────────────────────────────────────────┐  │
                               │  │   Next.js 15 Full-Stack App (Fluid Compute)      │  │
                               │  │   • Management & Analytics Executive Dashboard   │  │
                               │  │   • Master Menu, Pricing & Recipe BOM Engine     │  │
                               │  │   • Server Actions & REST API Endpoints          │  │
                               │  │   • Ultra-Fast SSR Dine-In QR Ordering PWA       │  │
                               │  └────────▲───────────────▲────────────────▲────────┘  │
                               │           │               │                │           │
                               │  ┌────────▼──────┐ ┌──────▼───────┐ ┌──────▼────────┐  │
                               │  │ Neon Postgres │ │ Vercel Blob  │ │ Vercel Cron & │  │
                               │  │ (ACID Ledger) │ │ (Halal/PDFs) │ │ LHDN MyInvois │  │
                               │  └───────────────┘ └──────────────┘ └───────────────┘  │
                               └───────────────────────────▲────────────────────────────┘
                                                           │
                                             HTTPS / WSS   │ (PWA Sync & Webhooks)
                                                           │
                      ┌────────────────────────────────────┴────────────────────────────────────┐
                      ▼                                                                         ▼
┌───────────────────────────────────────────────┐       ┌───────────────────────────────────────────────┐
│           In-Store Full-Service (FSR)         │       │          In-Store Quick-Service (QSR)         │
│  • PWA POS running on Chrome / Edge           │       │  • PWA POS running on Compact Touchscreen     │
│  • Browser IndexedDB (100% Offline Mode)      │       │  • Browser IndexedDB (100% Offline Mode)      │
│  • Local Print Bridge (Raw TCP Port 9100)     │       │  • Direct USB / Bluetooth ESC/POS Driver      │
│  • FSR Table Grid, Open Tabs & Split Bill     │       │  • Rapid Tap (&lt;15s) + Sequential Token Queue │
│  • 80mm Hot/Cold Kitchen & Bar LAN Printers   │       │  • Integrated Receipt Printer + CFD Screen    │
└───────────────────────────────────────────────┘       └───────────────────────────────────────────────┘
```

### Architectural Stack
* **Cloud Infrastructure**: **100% Vercel**. No standalone virtual machines or Docker hosts to patch.
* **Full-Stack Framework**: **Next.js 15 (App Router)** utilizing TypeScript and Tailwind CSS.
* **Relational Database**: **Neon Serverless Postgres** via Vercel Marketplace (connection pooling, instant point-in-time branch snapshots, ACID financial safety).
* **Caching & Session Locks**: **Upstash Redis** (millisecond table locking, preventing race conditions during simultaneous table seating).
* **Asset & Compliance Storage**: **Vercel Blob** (supplier Halal certificates, employee typhoid vaccination records, and invoice PDF archives).
* **Scheduled Jobs**: **Vercel Cron** (triggers month-end LHDN consolidated e-invoice compilation and Halal expiry notifications).
* **Local In-Store POS Runtime**: **Progressive Web App (PWA)** with Service Worker caching.
* **Local Offline Data Engine**: **IndexedDB** maintaining an immutable `outbox_events` log that syncs with Vercel once connectivity is detected.
* **Hardware Interfacing**: Lightweight local TCP socket bridge / WebUSB sending raw **ESC/POS byte streams** over port 9100.

---

## 5. Software Requirements Specification (SRS)

### 5.1 Front-of-House (FOH) Modules
* **SRS-FOH-01 (Table Map Designer)**: Visual drag-and-drop table grid with capacity, table numbers, and section zoning (Indoor, Patio, VIP).
* **SRS-FOH-02 (Table Lifecycle State Machine)**: Real-time table states: `VACANT` $\rightarrow$ `SEATED` $\rightarrow$ `ORDERED` $\rightarrow$ `SERVED` $\rightarrow$ `BILL_OUT`.
* **SRS-FOH-03 (Tab & Course Ordering)**: Support multi-round ordering (Drinks $\rightarrow$ Starters $\rightarrow$ Mains) under a single open table tab.
* **SRS-FOH-04 (Bill Operations)**: Split bill evenly by headcount, split bill by selecting specific line items, or combine multiple tables into one payment.
* **SRS-FOH-05 (QSR Rapid Tap)**: Single-tap ordering matrix optimized for cashier execution under 15 seconds per order.
* **SRS-FOH-06 (Token Calling Screen)**: Fullscreen responsive web view showing `Preparing` and `Now Calling` order tokens with audio chime.
* **SRS-FOH-07 (Dine-In QR Self-Ordering)**: Dynamic QR codes tied to specific table IDs allowing guests to browse, customize modifiers, and submit orders without app downloads.

### 5.2 Kitchen & Production (BOH) Modules
* **SRS-BOH-01 (Multi-Station Routing)**: Logic routing each order item to its designated station (e.g., Hot Wok, Cold Kitchen, Drink Bar) based on category.
* **SRS-BOH-02 (Kitchen Display System - KDS)**: Web-based bump screen with ticket status controls (`QUEUED`, `PREPARING`, `READY`), elapsed timer color thresholds (<10m green, 10–15m amber, >15m red), and audio alerts.

### 5.3 Inventory & Recipe Costing
* **SRS-INV-01 (Bill of Materials - BOM)**: Multi-level ingredient recipes with precise units of measure (grams, millilitres, units) and wastage factors.
* **SRS-INV-02 (Real-Time Stock Depletion)**: Automatic deduction of raw ingredients upon order checkout or kitchen ticket dispatch.
* **SRS-INV-03 (Low Stock Warning)**: Dashboard alerts when raw material inventory breaches safety stock thresholds.

### 5.4 Cash & Shift Management
* **SRS-FIN-01 (Cash Float Declaration)**: Cashier opening float registration before order ringing is enabled.
* **SRS-FIN-02 (X-Report)**: Mid-shift snapshot report showing current cash drawer balance, payment breakdowns, and voids without closing the shift.
* **SRS-FIN-03 (Z-Report)**: End-of-day shift closure producing final financial balancing, drawer over/short reconciliation, and immutable ledger locking.

---

## 6. PostgreSQL Database Schema (Neon / Vercel)

```sql
-- Schema: nexus_fnb
CREATE SCHEMA IF NOT EXISTS nexus_fnb;

-- 1. Outlets & Formatting Profile
CREATE TABLE nexus_fnb.outlets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(16) UNIQUE NOT NULL,             -- e.g. 'FSR-BANGSAR', 'QSR-KLCC'
    name VARCHAR(128) NOT NULL,
    outlet_type VARCHAR(8) NOT NULL CHECK (outlet_type IN ('FSR', 'QSR')),
    sst_registration_number VARCHAR(32),
    is_sst_enabled BOOLEAN DEFAULT TRUE,
    service_charge_percent NUMERIC(5,2) DEFAULT 10.00,
    address_line1 VARCHAR(255) NOT NULL,
    state VARCHAR(64) NOT NULL,
    postcode VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Halal-Certified Raw Ingredients
CREATE TABLE nexus_fnb.ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    uom VARCHAR(16) NOT NULL,                     -- 'KG', 'GRAM', 'LITER', 'ML', 'UNIT'
    current_cost_per_unit NUMERIC(10,4) NOT NULL,
    supplier_name VARCHAR(128) NOT NULL,
    is_halal_certified BOOLEAN DEFAULT TRUE,
    halal_cert_body VARCHAR(64),                  -- 'JAKIM', 'MUIS', 'CICOT', etc.
    halal_cert_number VARCHAR(64),
    halal_cert_expiry DATE,
    shelf_life_days INT DEFAULT 7,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Menu Items & Recipe Bill of Materials (BOM)
CREATE TABLE nexus_fnb.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    category VARCHAR(64) NOT NULL,                -- 'MAINS', 'BEVERAGES', 'SIDES', 'DESSERT'
    base_price NUMERIC(10,2) NOT NULL,
    kitchen_station VARCHAR(32) NOT NULL,         -- 'HOT_KITCHEN', 'DRINK_BAR', 'COLD_PREP'
    is_active BOOLEAN DEFAULT TRUE,
    packaging_fee NUMERIC(5,2) DEFAULT 0.00
);

CREATE TABLE nexus_fnb.recipe_bom (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID REFERENCES nexus_fnb.menu_items(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES nexus_fnb.ingredients(id),
    quantity_required NUMERIC(10,4) NOT NULL,
    wastage_allowance_percent NUMERIC(5,2) DEFAULT 5.00
);

-- 4. Floor & Dining Tables (FSR Only)
CREATE TABLE nexus_fnb.dining_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES nexus_fnb.outlets(id),
    table_number VARCHAR(16) NOT NULL,
    section VARCHAR(32) DEFAULT 'MAIN_DINING',     -- 'INDOOR', 'OUTDOOR', 'VIP'
    capacity INT DEFAULT 4,
    status VARCHAR(16) DEFAULT 'VACANT' CHECK (status IN ('VACANT', 'SEATED', 'ORDERED', 'SERVED', 'BILL_OUT')),
    active_order_id UUID,
    UNIQUE(outlet_id, table_number)
);

-- 5. Orders & Financial Transactions
CREATE TABLE nexus_fnb.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES nexus_fnb.outlets(id),
    order_number VARCHAR(32) NOT NULL,            -- e.g. 'FSR-20261109-0042'
    queue_token INT,                              -- 101, 102 for QSR
    table_id UUID REFERENCES nexus_fnb.dining_tables(id),
    order_mode VARCHAR(16) NOT NULL CHECK (order_mode IN ('DINE_IN', 'TAKEAWAY', 'DELIVERY')),
    
    subtotal_gross NUMERIC(10,2) NOT NULL,
    discount_total NUMERIC(10,2) DEFAULT 0.00,
    service_charge_amount NUMERIC(10,2) DEFAULT 0.00,
    sst_amount NUMERIC(10,2) DEFAULT 0.00,        -- 6%
    rounding_adjustment NUMERIC(5,2) DEFAULT 0.00,-- BNM 5-sen rule for cash
    total_payable NUMERIC(10,2) NOT NULL,
    
    payment_method VARCHAR(24),                   -- 'CASH', 'DUITNOW', 'CARD', 'TNG'
    payment_status VARCHAR(16) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'VOIDED', 'REFUNDED')),
    
    lhdn_status VARCHAR(16) DEFAULT 'PENDING' CHECK (lhdn_status IN ('PENDING', 'VALIDATED', 'CONSOLIDATED', 'EXEMPT')),
    lhdn_uuid VARCHAR(64),
    lhdn_validation_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

-- 6. Shift Management (X/Z Reports)
CREATE TABLE nexus_fnb.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES nexus_fnb.outlets(id),
    cashier_id UUID NOT NULL,
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    opening_float NUMERIC(10,2) NOT NULL,
    expected_cash_end NUMERIC(10,2),
    actual_cash_end NUMERIC(10,2),
    cash_variance NUMERIC(10,2),
    status VARCHAR(16) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED'))
);
```

---

## 7. Work Breakdown Structure (WBS & Task Catalog)

### Epic 1: Next.js 15 Foundation & Database Layer
* **TSK-ARCH-01 (Monorepo & Vercel Linking)**: Scaffold Next.js 15 App Router project with TypeScript, Tailwind, and link to Vercel production project.
* **TSK-ARCH-02 (Neon Postgres Migration)**: Apply the complete `nexus_fnb` DDL schema to Neon Serverless Postgres via Drizzle ORM or Prisma.
* **TSK-ARCH-03 (PWA & Offline Outbox)**: Configure Next.js Service Worker with IndexedDB outbox queue for offline order creation and automatic cloud sync.
* **TSK-ARCH-04 (Role-Based Fast PIN Switch)**: Implement quick 4-digit PIN authentication for Cashier, Waiter, Kitchen, and Manager roles.

### Epic 2: Front-of-House (FOH) Dual Operations
* **TSK-POS-01 (FSR Floor Grid Designer)**: Visual floor plan component allowing managers to arrange tables, shapes, and sections.
* **TSK-POS-02 (FSR Table Tab Lifecycle)**: State machine managing table seating, multi-round course firing, and active cart persistence.
* **TSK-POS-03 (Bill Split & Merge Engine)**: Calculation engine for splitting bills by seat, splitting by selected items, and merging tables.
* **TSK-POS-04 (QSR Rapid Tap Counter)**: Fast-tap order matrix with combo modifier modals and sub-15-second checkout flow.
* **TSK-POS-05 (QSR Token Calling Display)**: Secondary fullscreen display auto-incrementing tokens (`#101`..) with audio alerts.
* **TSK-POS-06 (Mobile Waiter Handheld)**: Responsive mobile interface designed specifically for 5.5-inch handheld devices (Sunmi V2s).

### Epic 3: Malaysian Statutory & Compliance Engine
* **TSK-TAX-01 (SST & Service Charge Module)**: Mathematical engine enforcing FSR cascading tax vs. QSR single tax with packaging fee rules.
* **TSK-TAX-02 (BNM 5-Sen Cash Rounding)**: Pure function implementing Bank Negara 5-sen cash rounding rules and generating adjustment journals.
* **TSK-LHDN-01 (LHDN MyInvois Client)**: API client for LHDN MyInvois sandbox/production with OAuth2 and payload serialization.
* **TSK-LHDN-02 (B2C Consolidated Batch Worker)**: Vercel Cron handler to compile monthly retail receipts into a consolidated submission.
* **TSK-LHDN-03 (B2B Instant Tax Invoice)**: POS modal to capture customer TIN, generate immediate e-Invoice, and produce verified receipt QR code.

### Epic 4: Hardware & ESC/POS Thermal Printing
* **TSK-PRT-01 (Raw ESC/POS Driver Bridge)**: Socket communication utility sending raw command bytes directly over TCP port 9100.
* **TSK-PRT-02 (Multi-Station Kitchen Router)**: Line-item routing separating order items to Hot Kitchen, Cold Larder, and Drink Bar printers.
* **TSK-PRT-03 (80mm Tax Receipt Formatter)**: Thermal receipt layout embedding SST registration number, itemization, 5-sen rounding, and LHDN QR code.
* **TSK-PRT-04 (Cash Drawer RJ11 Pulse)**: ESC/POS kick pulse (`10 14 01 00 05`) trigger upon cash transaction completion.

### Epic 5: Inventory, Halal & Shift Management
* **TSK-INV-01 (Recipe BOM Costing Engine)**: Multi-level recipe builder computing theoretical food cost percentages against ingredient prices.
* **TSK-INV-02 (Real-time Stock Depletion)**: Database trigger/function decrementing raw inventory balances upon order settlement.
* **TSK-HAL-01 (JAKIM Halal Cert Registry)**: Database and UI tracking supplier Halal certificate numbers with 60/30-day email and dashboard alerts.
* **TSK-HAL-02 (Staff Typhoid Records)**: Log of employee typhoid vaccination dates (3-year validity) and food handling certifications.
* **TSK-PAY-01 (Dynamic DuitNow QR)**: Integration with PayNet acquirer API to generate dynamic DuitNow QR codes with exact order total on CFD.
* **TSK-PAY-02 (Shift X/Z Reports)**: Opening float registry, midway snapshot (X-Report), and end-of-day closure (Z-Report) with cash variance tracking.

---

## 8. Implementation Roadmap & Execution Sprints

```
Sprint 1 (Weeks 1–4)        Sprint 2 (Weeks 5–8)        Sprint 3 (Weeks 9–12)       Sprint 4 (Weeks 13–16)
┌──────────────────────────┐┌──────────────────────────┐┌──────────────────────────┐┌──────────────────────────┐
│ Core Foundation          ││ In-Store FOH Dual Ops    ││ Compliance & Payments    ││ Inventory & Live Pilot   │
│ • Next.js 15 + Neon DB   ││ • FSR Table Floor Grid   ││ • SST & BNM 5¢ Rounding  ││ • Recipe BOM Depletion   │
│ • DDL Schema Migration   ││ • QSR Rapid Tap & Token  ││ • LHDN MyInvois Engine   ││ • JAKIM Halal Tracker    │
│ • PWA Offline Engine     ││ • Multi-station KDS      ││ • Dynamic DuitNow QR     ││ • Typhoid Health Log     │
│ • ESC/POS Raw Socket     ││ • Waiter Handheld UI     ││ • Shift X/Z Reports      ││ • Flagship Outlet Pilot  │
└──────────────────────────┘└──────────────────────────┘└──────────────────────────┘└──────────────────────────┘
```

---

## 9. Antigravity Agent Execution Protocol

When delegating tasks in Antigravity, subagents must reference this document:
1. **Agent 1 (Backend & Database)**: Executes Epic 1 (`TSK-ARCH-01` through `TSK-ARCH-04`) and Epic 5 (`TSK-INV-01`, `TSK-INV-02`).
2. **Agent 2 (Front-of-House POS UI)**: Executes Epic 2 (`TSK-POS-01` through `TSK-POS-06`).
3. **Agent 3 (Malaysian Compliance & FinTech)**: Executes Epic 3 (`TSK-TAX-01` through `TSK-LHDN-03`) and `TSK-PAY-01`.
4. **Agent 4 (Hardware & ESC/POS IoT)**: Executes Epic 4 (`TSK-PRT-01` through `TSK-PRT-04`).
5. **Agent 5 (Operations & Shift Management)**: Executes `TSK-HAL-01`, `TSK-HAL-02`, and `TSK-PAY-02`.

*This document serves as the immutable single source of truth for all subsequent code, configurations, and pull requests.*
