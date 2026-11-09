# Project Implementation Roadmap
## Nexus FnB Business Management System (Malaysia Edition)
**Execution Strategy:** 100% Vercel Production Native + Antigravity Subagent Delivery  
**Classification:** Single Source of Truth (SSOT)

---

### High-Level Roadmap Timeline

```
Month 1 (Weeks 1–4)          Month 2 (Weeks 5–8)          Month 3 (Weeks 9–12)         Month 4 (Weeks 13–16)
┌───────────────────────────┐┌───────────────────────────┐┌───────────────────────────┐┌───────────────────────────┐
│ Sprint 1: Core Foundation ││ Sprint 2: FOH Dual Ops    ││ Sprint 3: Compliance & Pay││ Sprint 4: Inventory & Launch│
│ • Next.js 15 + Neon DB    ││ • FSR Floor Grid Designer ││ • 6% SST & 10% SC Engine  ││ • Recipe BOM Depletion    │
│ • Complete DDL Migrations ││ • Table Tabs & Lifecycle  ││ • BNM 5-Sen Cash Rounding ││ • JAKIM Halal Registry    │
│ • PWA Offline IndexedDB   ││ • QSR Rapid Tap (&lt;15s)    ││ • LHDN MyInvois Gateway   ││ • Typhoid Health Log      │
│ • ESC/POS Raw TCP Driver  ││ • Multi-Station KDS Screen││ • Dynamic DuitNow QR      ││ • Flagship FSR/QSR Pilot  │
└───────────────────────────┘└───────────────────────────┘└───────────────────────────┘└───────────────────────────┘
```

---

### Milestone Breakdown

#### Milestone 1: Core Foundation & Data Modeling (Weeks 1–4)
* **Goal**: Establish the central database schema on Neon Postgres, Next.js 15 App Router scaffolding, and offline PWA foundation.
* **Deliverables**:
  1. Next.js 15 TypeScript project with Tailwind CSS and Vercel Fluid Compute setup.
  2. Neon Serverless Postgres schema migration (`outlets`, `menu_items`, `recipe_bom`, `ingredients`, `dining_tables`, `orders`, `shifts`).
  3. PWA Service Worker with IndexedDB local caching for zero-downtime offline ordering.
  4. Raw ESC/POS socket utility over port 9100.
  5. 4-digit PIN authentication with rapid cashier/supervisor switching.

#### Milestone 2: Dual Front-of-House (FOH) Engines (Weeks 5–8)
* **Goal**: Build operational interfaces for both Full-Service Restaurant (FSR) and Quick-Service Kiosks (QSR).
* **Deliverables**:
  1. **FSR Counter UI**: Visual floor plan designer, table occupancy states, multi-round course firing, and bill splitting/merging.
  2. **QSR Counter UI**: Single-screen rapid tap catalog, automatic order token sequencing (`#101`..), and single-touch checkout.
  3. **Kitchen Display System (KDS)**: Web-based bump screen with station filtering (Hot Wok, Cold Bar, Drink Counter) and audio chimes.
  4. **Customer Calling Screen**: Secondary display showing order progress (`Preparing` vs `Ready for Collection`).
  5. **Mobile Waiter Handheld**: Compact UI optimized for 5.5-inch Android terminals (e.g. Sunmi V2s).

#### Milestone 3: Malaysian Compliance & Payment Rails (Weeks 9–12)
* **Goal**: Full integration with mandatory Malaysian statutory requirements and fintech payment gateways.
* **Deliverables**:
  1. **Malaysian Tax Core**: Automated calculation of 10% Service Charge + 6% SST, and Bank Negara 5-sen cash rounding engine.
  2. **LHDN MyInvois Integration**:
     * B2C monthly consolidated e-invoicing batch generator via Vercel Cron.
     * On-demand B2B e-invoice generation with buyer TIN validation and receipt QR code printout.
  3. **Dynamic DuitNow QR**: Integration with PayNet acquirer (Curlec / Revenue Monster) to render dynamic QR on the Customer Facing Display (CFD).
  4. **Shift & Cash Reconciliation**: X-Report (mid-day review) and Z-Report (day-end ledger closure) with cash drawer discrepancy logging.

#### Milestone 4: Supply Chain, Halal & Pilot Deployment (Weeks 13–16)
* **Goal**: Recipe costing, automated inventory depletion, Halal audit trails, and live flagship pilot.
* **Deliverables**:
  1. Recipe BOM engine with yield calculation and theoretical vs. actual food cost tracking.
  2. Real-time ingredient stock depletion on order settlement.
  3. JAKIM Halal supplier certification tracker with 60/30-day automated expiry alerts.
  4. Staff typhoid injection records (*Suntikan Tifoid*, 3-year validity) and food handling certs.
  5. Flagship pilot deployment at Full-Service Restaurant & QSR Mall Kiosk.
