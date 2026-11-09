# Nexus FnB BMS (Malaysia Edition)

**Proprietary Multi-Format Restaurant & Kiosk Management System**  
**Repository:** [https://github.com/aku18xy/Nexus_FnB_BMS.git](https://github.com/aku18xy/Nexus_FnB_BMS.git)  
**Live SSOT Plan Portal (Vercel):** [https://nexus-fnb-bms-plan.vercel.app](https://nexus-fnb-bms-plan.vercel.app)  
**Vercel Project:** `nexus-fnb-bms-plan` (Root: `plan/`)

---

## 📌 Executive Summary

Nexus FnB BMS is an in-house enterprise business management system specifically built for a Malaysian F&B chain operating both:
1. **Full-Service Restaurants (FSR)**: Interactive table floor plans, multi-round tab ordering, bill split/combine, 10% Service Charge + 6% SST, and multi-station kitchen routing.
2. **Quick-Service Kiosks (QSR)**: Rapid tap checkout (<15 sec per order), pay-first workflow, sequential token queue calling (#101, #102), and takeaway packaging fees.

---

## 🇲🇾 Malaysian Statutory & Regulatory Compliance Core

* **LHDN MyInvois e-Invoicing**: Full compliance with Inland Revenue Board of Malaysia (IRBM) mandate:
  * Consolidated B2C monthly submissions.
  * Instant validated B2B e-Invoices with buyer TIN validation and receipt QR codes.
* **SST & Service Charge Engine**:
  * FSR: Subtotal + 10% Service Charge + 6% SST (cascading).
  * QSR: Subtotal + 6% SST (0% Service Charge).
* **Bank Negara Malaysia (BNM) 5-Sen Rounding**:
  * Automatic rounding mechanism applied strictly to CASH payments (1-2 to 0, 3-7 to 5, 8-9 to 10 sen). Exact sen payment enforced for DuitNow, E-Wallets, and Credit Cards.
* **JAKIM Halal Traceability**:
  * Tracking of raw ingredient supplier Halal certificates, issuing Islamic bodies, and 60-day expiry escalation.
* **KKM / PBT Health Records**:
  * Staff typhoid injection (*Suntikan Tifoid*, 3-year validity) and Food Handler Training certifications.

---

## 🏛️ System Architecture

* **Offline-First Hybrid Edge**: Local in-store SQLite master node ensures zero downtime during Unifi / Maxis fiber outages.
* **Raw ESC/POS Driver**: Direct TCP/IP socket printing over port 9100 to 80mm thermal printers with buzzer pulses.
* **Cloud HQ**: Central PostgreSQL database, NestJS modular API, Redis queues, and multi-outlet commissary management.

---

## 📂 Documentation & Single Source of Truth (SSOT)

All project planning, software requirements specifications, task descriptions, and roadmap documents are located in [`plan/`](./plan):

* [`plan/index.html`](./plan/index.html) — Interactive React Master Planning & SSOT Web Application.
* [`plan/docs/SRS.md`](./plan/docs/SRS.md) — Software Requirements Specification.
* [`plan/docs/ARCHITECTURE.md`](./plan/docs/ARCHITECTURE.md) — System Architecture & Hardware Topology.
* [`plan/docs/ROADMAP.md`](./plan/docs/ROADMAP.md) — 5-Phase Master Implementation Roadmap.
* [`plan/docs/TASKS.md`](./plan/docs/TASKS.md) — Work Breakdown Structure (WBS) & Task Descriptions.
