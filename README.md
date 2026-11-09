# Nexus FnB BMS (Malaysia Edition)

**Proprietary Multi-Format Restaurant & Kiosk Business Management System**  
Designed for Malaysian F&B chains operating **Full-Service Restaurants (FSR)** and **Quick-Service Kiosks (QSR)**.

---

## 📌 Single Source of Truth (SSOT)

All project planning, software requirements specifications (SRS), system architecture, regulatory compliance specifications, database schemas, and task breakdown structures are codified in:

👉 **[SSOT.md](./SSOT.md)** *(Single Source of Truth & Master Project Specification)*

### Quick Index of `SSOT.md`:
1. **Executive Project Charter**: Vision, business justification, and operational targets.
2. **Dual Operational Profiles**: FSR (table grid, courses, tabs, 10% SC + 6% SST) vs. QSR (rapid tap, token call, 0% SC + 6% SST).
3. **Malaysian Regulatory & Compliance Core**:
   * LHDN MyInvois e-Invoicing (Consolidated B2C & Validated B2B with QR receipt)
   * 6% SST + 10% Service Charge cascading formula
   * Bank Negara Malaysia (BNM) 5-sen cash rounding engine
   * JAKIM Halal ingredient tracking & 60-day expiry escalation
   * KKM / PBT Staff Typhoid (*Suntikan Tifoid*) & Food Handler certifications
4. **100% Vercel Serverless Architecture**:
   * Next.js 15 App Router (Fluid Compute)
   * Neon Serverless Postgres (ACID ledger)
   * Upstash Redis (real-time table locking)
   * Vercel Blob (Halal certs & PDF receipts)
   * Vercel Cron (LHDN monthly consolidation)
   * In-store offline-first PWA with IndexedDB local caching
   * Direct ESC/POS raw socket printing (Port 9100)
5. **Software Requirements Specification (SRS)**: FOH, BOH, Inventory, Cash, and Reporting functional requirements.
6. **PostgreSQL Relational Schema (DDL)**: Production DDL for outlets, tables, menu, recipe BOM, ingredients, orders, and shifts.
7. **Work Breakdown Structure (WBS)**: 25 itemized tasks across 5 epics with Task IDs and priorities.
8. **Implementation Roadmap**: 4-Sprint phased delivery timeline.
9. **Antigravity Multi-Agent Delegation Protocol**: Execution guidelines for autonomous subagents.

---

## 🛠️ Repository & Endpoints
* **Git Repository:** [https://github.com/aku18xy/Nexus_FnB_BMS.git](https://github.com/aku18xy/Nexus_FnB_BMS.git)
* **Application Endpoint (Vercel):** [https://nexus-fnb-bms.vercel.app](https://nexus-fnb-bms.vercel.app)
  * **Vercel Project:** `nexus-fnb-bms` (ID: `prj_nBSVXa8A8ieWesSmRPhYpojqXJro`)
  * **Region:** `sin1` (Singapore / closest low latency to Malaysia)
* **Live SSOT Plan Portal (Vercel):** [https://nexus-fnb-bms-plan.vercel.app](https://nexus-fnb-bms-plan.vercel.app)
  * **Vercel Project:** `nexus-fnb-bms-plan` (Root: `plan/`)
* **Interactive Plan & Documentation Directory:** [`plan/`](./plan/)
  * [`plan/index.html`](./plan/index.html) — Interactive React SSOT Master Planning App
  * [`plan/docs/SRS.md`](./plan/docs/SRS.md) — Software Requirements Specification
  * [`plan/docs/ARCHITECTURE.md`](./plan/docs/ARCHITECTURE.md) — 100% Vercel Serverless Architecture & Hardware
  * [`plan/docs/ROADMAP.md`](./plan/docs/ROADMAP.md) — 4-Sprint Implementation Roadmap
  * [`plan/docs/TASKS.md`](./plan/docs/TASKS.md) — WBS & Antigravity Agent Execution Blueprint
