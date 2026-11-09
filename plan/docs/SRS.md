# Software Requirements Specification (SRS)
## Nexus FnB Business Management System (Malaysia Edition)
**Document Version:** 1.0.0  
**Target Environment:** In-house Proprietary Multi-Format Chain (Full-Service Restaurant & Quick-Service Kiosk)  
**Jurisdiction:** Malaysia (LHDN, JKDM, JAKIM, KKM, BNM)  
**Classification:** Single Source of Truth (SSOT)

---

### 1. Introduction

#### 1.1 Purpose
This document defines the complete functional, technical, and compliance requirements for **Nexus FnB BMS**, a proprietary enterprise business management system designed specifically for a Malaysian F&B chain operating both **Full-Service Restaurants (FSR)** and **Quick-Service Kiosks (QSR)**.

#### 1.2 Scope of System
Nexus FnB BMS unifies:
1. **Front-of-House (FOH)**: Dual-mode POS (FSR Table Management vs. QSR Rapid Checkout), QR Dine-In Ordering, Customer Facing Display (CFD), and Token Calling System.
2. **Kitchen & Production (BOH)**: Multi-station Kitchen Display System (KDS) and ESC/POS thermal network routing.
3. **Malaysian Compliance Core**: LHDN MyInvois e-Invoicing (Consolidated & B2B), Royal Malaysian Customs SST (6%), Bank Negara Malaysia (BNM) 5-sen cash rounding, and JAKIM Halal raw-ingredient traceability.
4. **Supply Chain & Inventory**: Real-time recipe Bill of Materials (BOM) depletion, central commissary requisition, and inter-branch stock transfers.
5. **Back-Office & Finance**: Shift management (X/Z Reports), petty cash reconciliation, and accounting exports (AutoCount, SQL Account, Xero).

#### 1.3 Definitions, Acronyms & Abbreviations
* **BNM**: Bank Negara Malaysia (Central Bank of Malaysia).
* **BOM**: Bill of Materials (Recipe breakdown by gram/millilitre).
* **CFD**: Customer Facing Display (secondary screen showing cart, taxes, and dynamic DuitNow QR).
* **ESC/POS**: Standard command protocol for thermal printers.
* **FSR**: Full-Service Restaurant (dine-in table service, courses, post-pay).
* **JAKIM**: Jabatan Kemajuan Islam Malaysia (Halal certification authority).
* **KDS**: Kitchen Display System.
* **KKM**: Kementerian Kesihatan Malaysia (Ministry of Health).
* **LHDN**: Lembaga Hasil Dalam Negeri (Inland Revenue Board of Malaysia).
* **MyInvois**: Official LHDN platform for e-invoicing.
* **PBT**: Pihak Berkuasa Tempatan (Local municipal council e.g., DBKL, MBPJ).
* **QSR**: Quick-Service Restaurant / Kiosk (counter service, token call, pay-first).
* **SST**: Sales and Service Tax (6% Service Tax under Group B).

---

### 2. Overall System Architecture & Topology

#### 2.1 Hybrid Edge-and-Cloud Topology
```
[Cloud Central HQ: PostgreSQL + NestJS API]
       ▲                     ▲
       │ HTTPS/WSS Sync      │ HTTPS/WSS Sync
       ▼                     ▼
[Outlet A (FSR): Edge POS]   [Outlet B (QSR): Edge POS]
 ├── Table Management         ├── Rapid Counter Tap
 ├── Local SQLite Offline DB  ├── Local SQLite Offline DB
 ├── Multi-station KDS / LAN  ├── Integrated ESC/POS Driver
 └── Dynamic DuitNow Terminal └── Token Display Screen
```

#### 2.2 Offline Resilience Invariant
* **Zero Downtime Rule**: A loss of external internet connectivity (e.g., Unifi/Maxis fiber outage) must not prevent an outlet from taking orders, sending tickets to local kitchen printers/KDS, or processing cash/offline DuitNow transactions.
* **Sync Engine**: In-store operations run on a local SQLite cache. Upon reconnect, an idempotent delta-sync updates Cloud HQ.

---

### 3. Functional Requirements

#### 3.1 Dual Front-of-House (FOH) Operating Modes

##### 3.1.1 Full-Service Restaurant (FSR) Mode
* **FR-FSR-01 Table Management**: Visual floor plan (Indoor, Outdoor, Private Dining). Real-time table states: `VACANT`, `SEATED`, `ORDERED`, `FOOD_SERVED`, `BILL_PRINTED`, `CLEANING`.
* **FR-FSR-02 Tab Lifecycle**: Support multi-round ordering on an open table tab.
* **FR-FSR-03 Bill Operations**: Split bill by seat, split bill by item, and combine multiple tables into a single bill.
* **FR-FSR-04 Waiter Handheld**: Mobile responsive web / native Android handheld app (e.g., Sunmi V2s) allowing floor staff to place orders table-side.
* **FR-FSR-05 Table QR Dine-In**: Customers scan dynamic table QR code to view visual menu, select modifiers, and fire orders directly to the kitchen.

##### 3.1.2 Quick-Service Kiosk (QSR) Mode
* **FR-QSR-01 Rapid Touch Interface**: Optimized for high-throughput counter transactions (< 15 seconds per order).
* **FR-QSR-02 Pay-First Enforcement**: Order status transitions to `CONFIRMED` only after payment settlement.
* **FR-QSR-03 Token & Queue Calling**: Automatically generate daily sequential token numbers (e.g., `#101`, `#102`). Web-based Calling Screen for customer pickup display (`Preparing` vs `Ready for Pickup`).
* **FR-QSR-04 Takeaway & Packaging**: Automatic prompt for `Dine-In` vs `Takeaway` with automated packaging surcharges where configured.

#### 3.2 Malaysian Financial & Tax Engine

##### 3.2.1 SST & Service Charge Calculations
* **FR-TAX-01 Service Charge (FSR)**: Configurable 10% service charge calculated on discounted food/beverage subtotal:
  $$\text{Service Charge} = (\text{Subtotal} - \text{Discount}) \times 0.10$$
* **FR-TAX-02 Service Tax (SST 6%)**: 6% Service Tax levied on the subtotal plus service charge:
  $$\text{SST} = ((\text{Subtotal} - \text{Discount}) + \text{Service Charge}) \times 0.06$$
* **FR-TAX-03 QSR Exemption**: In QSR mode, Service Charge defaults to 0%. SST is calculated directly on taxable items.

##### 3.2.2 Bank Negara Malaysia (BNM) 5-Sen Cash Rounding
* **FR-TAX-04 Cash Rounding Rule**:
  * Ends in 1, 2 sen $\rightarrow$ round down to 0 sen.
  * Ends in 3, 4 sen $\rightarrow$ round up to 5 sen.
  * Ends in 6, 7 sen $\rightarrow$ round down to 5 sen.
  * Ends in 8, 9 sen $\rightarrow$ round up to 10 sen.
  * *Applies strictly to CASH payments only. Card, DuitNow, and E-Wallets pay exact cents.*

##### 3.2.3 LHDN MyInvois e-Invoicing Engine
* **FR-LHDN-01 Consolidated B2C Submission**: Group all retail walk-in transactions without specific buyer TIN into a monthly Consolidated e-Invoice submitted via LHDN API within 7 calendar days after month-end.
* **FR-LHDN-02 Individual B2B / Taxpayer e-Invoice**: Allow cashiers to capture Buyer TIN, Buyer Registration/NRIC, and Company Name. Instant validation with LHDN MyInvois API.
* **FR-LHDN-03 QR Validation on Receipt**: Print official LHDN QR code and UUID on 80mm receipt for customers to verify e-Invoice status on the MyInvois portal.

#### 3.3 Payments & Local FinTech Integration
* **FR-PAY-01 Dynamic DuitNow QR**: Integration via acquirer API (Curlec / Revenue Monster / PayNet partner) displaying order-specific dynamic QR code with embedded amount on the Customer Facing Display.
* **FR-PAY-02 E-Wallets**: Native support for Touch 'n Go eWallet, GrabPay, Boost, and ShopeePay.
* **FR-PAY-03 Cash Management**: Cash float declaration at start-of-day, Cash Drop/Paid-Out logs, mid-shift **X-Report**, and end-of-day **Z-Report** with cash drawer reconciliation.

#### 3.4 Kitchen Display System & ESC/POS Routing
* **FR-KDS-01 Multi-Station Routing**: Items automatically routed based on category:
  * Station 1: Hot Wok / Grill (Kitchen Ticket)
  * Station 2: Cold / Appetizer / Prep (Kitchen Ticket)
  * Station 3: Bar / Drink Station (Bar Ticket)
  * Station 4: Cashier / Dispatch (Checker Slip)
* **FR-KDS-02 ESC/POS Protocol**: Raw TCP/IP socket printing to 80mm network thermal printers (Epson, Rongta, Xprinter) with buzzer support on new orders.
* **FR-KDS-03 KDS Screen**: Color-coded time alerts (Green: < 5 min, Yellow: 5–10 min, Red: > 15 min overdue).

#### 3.5 Back-of-House (BOH) & Inventory Management
* **FR-INV-01 Recipe BOM**: Granular ingredient definition (e.g., 1x Nasi Lemak Sambal uses 30g Chili Paste, 15g Anchovies, 5g Belacan).
* **FR-INV-02 Real-Time Depletion**: Automatically deduct ingredients from branch inventory when an order is settled or bumped from KDS.
* **FR-INV-03 Central Commissary & Requisition**: Branches create purchase requisitions to Central Kitchen HQ. HQ dispatches with delivery orders (DO).
* **FR-INV-04 Wastage Tracking**: Log spoilage, burnt dishes, or expired ingredients with mandatory reason codes.

#### 3.6 Halal & Health Regulatory Tracking
* **FR-REG-01 JAKIM Halal Cert Tracking**: Database of all raw ingredient suppliers, their Halal certification numbers, issuing bodies (JAKIM or recognized foreign Islamic bodies), and certificate expiration dates.
* **FR-REG-02 Halal Expiry Alerts**: Automated 60-day, 30-day, and 7-day notifications before supplier halal certification expires.
* **FR-REG-03 Staff Health Records**: Record employee typhoid vaccination (*Suntikan Tifoid*) dates (valid 3 years) and Food Handler Training certificates (*Latihan Pengendali Makanan*) to comply with KKM/PBT inspections.

---

### 4. Non-Functional Requirements (NFR)

* **NFR-PERF-01 Latency**: Local POS counter tap latency < 50ms; kitchen ticket dispatch < 500ms over local Wi-Fi/LAN.
* **NFR-RELI-01 High Availability**: Local outlet continues functioning at 100% capacity during wide-area internet outage.
* **NFR-SECU-01 Role-Based Access Control (RBAC)**: Strict permission boundaries:
  * `Cashier`: Take orders, accept payment, print bill.
  * `Supervisor`: Void item, apply managerial discount, reprint Z-Report.
  * `Store Manager`: Cash drawer open, float adjust, stock intake.
  * `HQ Admin`: Master menu pricing, recipe BOM edit, LHDN config, financial auditing.
* **NFR-AUDI-01 Audit Trail**: Immutable logging of all item voids, cancellations, discounts, drawer openings, and price overrides.

---

### 5. Verification & Acceptance Criteria
1. **Financial Test**: A test bill with Subtotal RM100.00, 10% Service Charge (RM10.00), and 6% SST (RM6.60) yields RM116.60. For cash payment of RM116.62, the rounding engine outputs RM116.60 (2 sen rounded down).
2. **LHDN Test**: System generates compliant XML/JSON payload matching LHDN MyInvois 1.0 schema, digitally signed with outlet X.509 certificate.
3. **Hardware Test**: Sending a 50-item order triggers simultaneous print jobs to 3 distinct thermal printers within 1.2 seconds without buffer overflow.
