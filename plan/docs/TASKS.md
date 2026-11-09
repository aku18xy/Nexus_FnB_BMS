# Work Breakdown Structure & Task Descriptions (WBS)
## Nexus FnB Business Management System (Malaysia Edition)
**Document Version:** 1.0.0  
**Classification:** Single Source of Truth (SSOT)

---

### Epic 1: Architecture, Core Infrastructure & Database

| Task ID | Task Title | Description | Est. Days | Priority |
| :--- | :--- | :--- | :---: | :---: |
| **TSK-ARCH-01** | Repository & Monorepo Setup | Initialize NestJS backend, React/Vite POS front-end, shared types package, and ESLint/Prettier setup. | 2 | High |
| **TSK-ARCH-02** | PostgreSQL Schema Migration | Implement schema for `outlets`, `users`, `menu_items`, `recipe_bom`, `ingredients`, `dining_tables`, and `orders`. | 3 | High |
| **TSK-ARCH-03** | Local SQLite & Sync Service | Build the local outbox event logger and background sync daemon for offline-to-cloud transactional synchronization. | 5 | Critical |
| **TSK-ARCH-04** | Role-Based Access Control (RBAC) | Implement PIN-code cashier authentication (Cashier, Waiter, Kitchen, Supervisor, Store Manager, HQ Admin). | 2 | High |

---

### Epic 2: Front-of-House (FOH) & POS Interfaces

| Task ID | Task Title | Description | Est. Days | Priority |
| :--- | :--- | :--- | :---: | :---: |
| **TSK-POS-01** | FSR Table Floor Plan Designer | Interactive visual grid to configure tables, shapes (round, square), sections (Indoor, Outdoor), and capacity. | 4 | High |
| **TSK-POS-02** | FSR Table State & Tab Management | Handle table occupancy lifecycle (`VACANT` $\rightarrow$ `SEATED` $\rightarrow$ `ORDERED` $\rightarrow$ `SERVED` $\rightarrow$ `BILL_OUT`). Multi-round order firing. | 4 | Critical |
| **TSK-POS-03** | Bill Split & Combine Engine | Allow splitting bills evenly, by specific line items, or merging multiple tables onto a single check. | 3 | High |
| **TSK-POS-04** | QSR Rapid Tap Counter | High-throughput QSR interface: single-screen touch catalog with combo modifier prompts and instant checkout. | 3 | Critical |
| **TSK-POS-05** | QSR Queue Token & Calling Display | Generate daily sequential token numbers (`#101`..`#999`) and build a fullscreen Customer Calling web view (`Preparing` / `Ready`). | 2 | Medium |
| **TSK-POS-06** | Mobile Waiter Handheld View | Compact UI optimized for 5.5-inch Android terminals (e.g. Sunmi V2s) for table-side order taking. | 3 | Medium |

---

### Epic 3: Malaysian Tax, Compliance & LHDN Engine

| Task ID | Task Title | Description | Est. Days | Priority |
| :--- | :--- | :--- | :---: | :---: |
| **TSK-TAX-01** | SST & Service Charge Engine | Implement calculation formulas: Subtotal + 10% Service Charge (FSR only) + 6% SST (both FSR & QSR). | 2 | Critical |
| **TSK-TAX-02** | BNM 5-Sen Cash Rounding Module | Implement Bank Negara Malaysia rounding algorithm strictly for cash payments; generate journal adjustment entries. | 1 | Critical |
| **TSK-LHDN-01** | LHDN MyInvois API Client | Connect to LHDN API (Sandbox & Production) with OAuth2 / digital certificate signing and XML/JSON payload serialization. | 5 | Critical |
| **TSK-LHDN-02** | B2C Consolidated e-Invoice Generator | Monthly batch worker grouping all non-TIN retail receipts into an aggregated e-invoice payload submitted to LHDN. | 4 | High |
| **TSK-LHDN-03** | B2B Instant Tax e-Invoice | Cashier interface to input customer TIN, SST number, and email. Instant validation with LHDN, returning QR code on receipt. | 3 | High |

---

### Epic 4: Hardware & ESC/POS Printing Engine

| Task ID | Task Title | Description | Est. Days | Priority |
| :--- | :--- | :--- | :---: | :---: |
| **TSK-PRT-01** | Raw ESC/POS Socket Driver | Create a Node.js/Go local driver sending raw bytes over TCP/IP port 9100 and USB serial without browser dialogs. | 3 | Critical |
| **TSK-PRT-02** | Multi-Station Kitchen Ticket Router | Route order line items to specific printers (Hot Wok, Bar, Cold Station) with item modification highlights and buzzer pulses. | 3 | Critical |
| **TSK-PRT-03** | 80mm Customer Receipt Formatter | Build standard receipt template containing SST registration number, tax breakdown, 5-sen rounding, and LHDN QR code. | 2 | High |
| **TSK-PRT-04** | Cash Drawer Pulse Trigger | Send ESC/POS pulse (`10 14 01 00 05`) to RJ11 port on cash settlement or authorized supervisor manual opening. | 1 | High |

---

### Epic 5: Payments & FinTech Integration

| Task ID | Task Title | Description | Est. Days | Priority |
| :--- | :--- | :--- | :---: | :---: |
| **TSK-PAY-01** | Dynamic DuitNow QR Generator | Integrate with PayNet acquirer API to generate dynamic payment QR codes with embedded exact order amount on CFD screen. | 4 | Critical |
| **TSK-PAY-02** | Malaysian E-Wallets Gateway | Implement webhook handlers for Touch 'n Go eWallet, GrabPay, Boost, and ShopeePay status verification. | 3 | High |
| **TSK-PAY-03** | Shift Float, X-Report & Z-Report | Shift open float declaration, midway cash pull (X-Report), and end-of-day Z-Report with cash variance calculations. | 3 | High |

---

### Epic 6: Inventory, Recipe BOM & Central Commissary

| Task ID | Task Title | Description | Est. Days | Priority |
| :--- | :--- | :--- | :---: | :---: |
| **TSK-INV-01** | Recipe BOM & Yield Management | Create hierarchical recipe manager (e.g. Master Sauce batch recipe broken into portioned dish ingredients). | 4 | High |
| **TSK-INV-02** | Real-Time Stock Depletion Engine | Deduct ingredient stock automatically upon order settlement; trigger low-stock alerts. | 3 | High |
| **TSK-INV-03** | Central Kitchen Requisition & DO | Inter-branch purchase requisition, Central Commissary production batching, and branch delivery order (DO) confirmation. | 5 | Medium |
| **TSK-INV-04** | Wastage & Spoilage Log | Allow kitchen staff to record spoiled or expired raw ingredients with mandatory supervisor sign-off. | 2 | Medium |

---

### Epic 7: Regulatory, Halal & Health Tracking

| Task ID | Task Title | Description | Est. Days | Priority |
| :--- | :--- | :--- | :---: | :---: |
| **TSK-HAL-01** | Supplier Halal Cert Registry | Record supplier Halal certificate numbers, issuing Islamic bodies, and expiry dates with automated 60/30-day alerts. | 2 | High |
| **TSK-HAL-02** | Typhoid & Food Handler Training Log | Database of employee typhoid injection dates (*Suntikan Tifoid*, 3-year validity) and food handling certs for PBT council audits. | 2 | High |
| **TSK-HAL-03** | Audit-Ready Halal Dossier Export | One-click PDF/CSV export of all active ingredients, supplier certs, and delivery DOs formatted for JAKIM inspection. | 2 | Medium |
