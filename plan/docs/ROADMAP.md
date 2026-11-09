# Project Roadmap & Milestones
## Nexus FnB Business Management System (Malaysia Edition)
**Target:** In-House Proprietary Deployment across FSR & QSR Outlets  
**Classification:** Single Source of Truth (SSOT)

---

### High-Level Roadmap Overview

```
2026 Q4                      2027 Q1                      2027 Q2                      2027 Q3
┌───────────────────────────┐┌───────────────────────────┐┌───────────────────────────┐┌───────────────────────────┐
│ Phase 1: Core Foundation  ││ Phase 2: In-Store FOH     ││ Phase 3: Compliance & Pay ││ Phase 4: Enterprise Scale │
│ • DB Schemas & NestJS API ││ • Dual FSR / QSR POS UI   ││ • LHDN MyInvois Engine    ││ • Multi-Branch Warehouse  │
│ • Menu & Recipe BOM Engine││ • Table Map & Floor Plan  ││ • DuitNow Dynamic QR      ││ • AutoCount / SQL Export  │
│ • Local SQLite Sync Agent ││ • ESC/POS Station Routing ││ • SST & 5-Sen Rounding    ││ • Central Commissary BOM  │
│ • Hardware Driver Spikes  ││ • Real-time KDS Display   ││ • WhatsApp Customer CRM   ││ • Mobile Waiter Handhelds │
└───────────────────────────┘└───────────────────────────┘└───────────────────────────┘└───────────────────────────┘
```

---

### Detailed Milestone Breakdown

#### Milestone 1: Core Foundation & Data Modeling (Weeks 1 – 4)
* **Goal**: Establish the central database schema, core REST/GraphQL endpoints, and hardware communication primitives.
* **Key Deliverables**:
  1. PostgreSQL schema deployed with multi-outlet support (`outlets`, `menu_items`, `recipe_bom`, `ingredients`, `orders`).
  2. Local SQLite schema and synchronization daemon specification (Outbox pattern).
  3. Raw ESC/POS network socket driver utility (testing raw byte streams over port 9100).
  4. Authentication & Role-Based Access Control (RBAC) with PIN-based quick cashier switching.

#### Milestone 2: Dual Front-of-House (FOH) Engines (Weeks 5 – 8)
* **Goal**: Build operational interfaces for both Full-Service Restaurant (FSR) and Quick-Service Kiosks (QSR).
* **Key Deliverables**:
  1. **FSR Counter UI**: Visual floor plan designer, table occupancy states, multi-round ordering, bill splitting, and table transfers.
  2. **QSR Counter UI**: Rapid tap screen, automatic order token sequencing (`#101`, `#102`), and single-click checkout.
  3. **Kitchen Display System (KDS)**: Web-based bump screen with station filtering (Hot Wok, Cold Bar, Drink Counter) and audio chimes.
  4. **Customer Calling Screen**: Secondary display showing order progress (`Preparing` vs `Ready for Collection`).

#### Milestone 3: Malaysian Compliance & Payment Rails (Weeks 9 – 12)
* **Goal**: Full integration with mandatory Malaysian statutory requirements and fintech payment gateways.
* **Key Deliverables**:
  1. **Malaysian Tax Core**: Automated calculation of 10% Service Charge + 6% SST, and Bank Negara 5-sen cash rounding engine.
  2. **LHDN MyInvois Integration**:
     * B2C monthly consolidated e-invoicing batch generator.
     * On-demand B2B e-invoice generation with buyer TIN validation and receipt QR code printout.
  3. **Dynamic DuitNow QR**: Integration with PayNet acquirer (Curlec / Revenue Monster) to render dynamic QR on the Customer Facing Display (CFD).
  4. **Shift & Cash Reconciliation**: X-Report (mid-day review) and Z-Report (day-end ledger closure) with cash drawer discrepancy logging.

#### Milestone 4: Supply Chain, Halal & Commissary (Weeks 13 – 16)
* **Goal**: Inventory depletion, central kitchen requisitions, and Halal certification tracking.
* **Key Deliverables**:
  1. **Real-time Recipe Depletion**: Automatic raw ingredient deduction upon order settlement.
  2. **Central Commissary Module**: Purchase requisitions from branch to central warehouse; batch production and inter-outlet delivery orders.
  3. **JAKIM Halal Tracking**: Supplier halal certificate expiry database with automated 60/30-day escalation alerts.
  4. **Staff Health & Typhoid Tracking**: Record typhoid vaccination dates (*Suntikan Tifoid*) and Food Handler Training certifications for local council compliance.

#### Milestone 5: Accounting Integration & Production Rollout (Weeks 17 – 20)
* **Goal**: End-to-end pilot run in 1 FSR flagship and 1 QSR kiosk.
* **Key Deliverables**:
  1. **Accounting Bridge**: Automated daily sales, SST journal, and inventory COGS sync to AutoCount / SQL Account / Xero.
  2. **Pilot Deployment**: Hardware installation (Sunmi POS, Epson printers, cash drawers) in pilot branch.
  3. **Staff Training & SOP Documentation**: Runbook for cashiers, kitchen supervisors, and store managers.
  4. **Post-Launch Audit**: Review e-invoice validation rates with LHDN MyInvois portal and verify cash drawer balancing.
