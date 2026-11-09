# Software Requirements Specification (SRS)
## Nexus FnB Business Management System (Malaysia Edition)
**Document Version:** 2.0.0 (100% Vercel Production Native)  
**Target Environment:** In-house Proprietary Multi-Format Chain (Full-Service Restaurant & Quick-Service Kiosk)  
**Jurisdiction:** Malaysia (LHDN, JKDM, JAKIM, KKM, BNM)  
**Classification:** Single Source of Truth (SSOT)

---

### 1. Introduction & Vision

#### 1.1 Purpose
This document specifies the software requirements for **Nexus FnB BMS**, an in-house proprietary Business Management System tailored specifically for Malaysian F&B chains operating:
1. **Full-Service Restaurants (FSR)**: Floor grid, table tabs, course firing, bill splitting, and multi-station kitchen routing.
2. **Quick-Service Kiosks (QSR)**: Rapid-tap cashiering (<15s throughput), pay-first settlement, queue tokens (`#101`..), and takeaway packaging fees.

#### 1.2 Core Mandates
* **100% Vercel Serverless Production**: Cloud HQ, Back-Office, APIs, and QR Menus run on Vercel (Next.js 15 Fluid Compute, Neon Serverless Postgres, Vercel Blob, Vercel Cron, Upstash Redis). Zero dedicated AWS EC2 or Linux VPS instances.
* **Offline-First Resilience**: In-store operations continue without interruption during local Unifi/Maxis fiber disruptions via browser IndexedDB caching and direct local ESC/POS printing.
* **Malaysian Regulatory Compliance**:
  * **LHDN MyInvois e-Invoicing**: Automated monthly B2C consolidated batch submissions & real-time validated B2B e-invoices with QR code on receipts.
  * **SST & Service Charge**: FSR (Subtotal + 10% Service Charge + 6% SST) vs QSR (Subtotal + 6% SST, 0% Service Charge).
  * **BNM 5-Sen Cash Rounding**: Bank Negara Malaysia 5-sen rounding mechanism applied strictly to Cash payments.
  * **JAKIM Halal Traceability**: Tracking raw ingredient supplier Halal certificates, issuing bodies, and 60-day expiry escalation.
  * **KKM / PBT Health Records**: Employee typhoid vaccination dates (*Suntikan Tifoid*, 3-year validity) and Food Handler Training certifications.

---

### 2. Functional Requirements Specification

#### 2.1 Front-of-House (FOH) Operations

##### 2.1.1 Full-Service Restaurant (FSR) Module
* **REQ-FSR-01 (Interactive Floor Plan)**: Managers can arrange tables by shape (square, circle, rectangle), section (Indoor, Outdoor, Bar, VIP), and capacity.
* **REQ-FSR-02 (Table Lifecycle State Machine)**: Tables transition through states: `VACANT` $\rightarrow$ `SEATED` $\rightarrow$ `ORDERED` $\rightarrow$ `SERVED` $\rightarrow$ `BILL_OUT`.
* **REQ-FSR-03 (Open Tab & Multi-Round Firing)**: Guests maintain an open tab. Staff can fire drinks first, followed by starters and main courses.
* **REQ-FSR-04 (Bill Splitting & Merging)**: Supports splitting bills evenly across N persons, splitting by specific item selections, or merging multiple tables onto one bill.
* **REQ-FSR-05 (Mobile Waiter Handheld)**: Responsive interface optimized for 5.5-inch Android handhelds (e.g. Sunmi V2s) for table-side ordering.

##### 2.1.2 Quick-Service Kiosk (QSR) Module
* **REQ-QSR-01 (Rapid-Tap Order Matrix)**: Single-touch item grid optimized for transaction completion in under 15 seconds.
* **REQ-QSR-02 (Combo Upsell Modifiers)**: Automatically prompts for combo add-ons (e.g., Main + Drink + Upsize Side).
* **REQ-QSR-03 (Pay-First Enforcement)**: Order is transmitted to kitchen only after payment confirmation.
* **REQ-QSR-04 (Queue Token Calling)**: Generates sequential daily tokens (`#101`, `#102`..) with a secondary screen showing `Preparing` vs `Ready for Collection`.
* **REQ-QSR-05 (Takeaway Packaging Surcharge)**: Configurable packaging fee automatically applied for takeaway orders.

---

#### 2.2 Malaysian Regulatory & FinTech Core

##### 2.2.1 LHDN MyInvois e-Invoicing
* **REQ-LHDN-01 (B2C Monthly Consolidation)**: Aggregates retail sales without individual buyer TIN into a monthly consolidated e-invoice submitted to LHDN within 7 calendar days after month-end.
* **REQ-LHDN-02 (B2B Real-Time Validation)**: Validates corporate buyer TIN / BRN via LHDN API, receives UUID, and prints validation QR code directly on the 80mm thermal receipt.

##### 2.2.2 Tax & Currency Engine
* **REQ-TAX-01 (SST & Service Charge Formula)**:
  * FSR: $\text{Total} = (\text{Subtotal} + \text{10\% Service Charge}) \times 1.06$
  * QSR: $\text{Total} = (\text{Subtotal} + \text{Packaging Fee}) \times 1.06$
* **REQ-TAX-02 (Bank Negara 5-Sen Cash Rounding)**:
  * Strict rounding for CASH only: 1–2 sen rounded down to 0; 3–7 sen rounded to 5; 8–9 sen rounded up to 10.
  * Exact sen charged for cashless payments (DuitNow, Credit/Debit, E-Wallets).

##### 2.2.3 Halal & Food Safety
* **REQ-HAL-01 (JAKIM Halal Cert Registry)**: Tracks supplier Halal certificate numbers, Islamic certification bodies, and validity dates with automated 60-day expiry notifications.
* **REQ-HAL-02 (Typhoid & Food Handler Training)**: Tracks mandatory 3-year typhoid injection validity and KKM certified training for all outlet staff.

---

#### 2.3 Kitchen, Hardware & Printing

* **REQ-PRT-01 (Raw ESC/POS Driver)**: Bypasses OS print dialogs; sends raw byte streams directly to thermal printers via TCP port 9100.
* **REQ-PRT-02 (Station Routing)**: Routes line items to designated kitchen stations (Hot Kitchen, Cold Larder, Bar).
* **REQ-PRT-03 (80mm Tax Receipt Formatter)**: Generates receipt with SST ID, tax breakdown, 5-sen rounding line, and LHDN QR code.
* **REQ-PRT-04 (Cash Drawer Kick)**: Fires RJ11 24V pulse (`10 14 01 00 05`) upon cash transaction completion.
* **REQ-KDS-01 (Kitchen Display System)**: Web-based bump screen with real-time ticket progression, color timers, and audio chimes.

---

### 3. Non-Functional Requirements

* **PERF-01 (Sub-Second Ordering)**: In-store touch actions respond in $<100\text{ms}$; kitchen ticket prints in $<500\text{ms}$.
* **RELI-01 (Zero-Downtime Offline)**: POS remains 100% operational during internet dropouts using browser IndexedDB.
* **SECU-01 (Fast PIN Switch)**: Cashiers authenticate via 4-digit PIN in $<1\text{s}$; manager actions require supervisor PIN override.
