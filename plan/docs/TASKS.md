# Work Breakdown Structure (WBS) & Antigravity Execution Blueprint
## Nexus FnB Business Management System (Malaysia Edition)
**Document Version:** 2.0.0 (100% Vercel Native)  
**Execution Standard:** All tasks are actionable, testable, and directly delegatable to Antigravity Subagents.  
**Classification:** Single Source of Truth (SSOT)

---

### Epic 1: Next.js 15 Foundation & Database Layer (Weeks 1–4)

#### TSK-ARCH-01: Next.js 15 App Router & Vercel Project Scaffolding
* **Priority:** Critical | **Estimate:** 2 Days | **Status:** Ready
* **Scope:** Initialize a Next.js 15 App Router project with TypeScript, Tailwind CSS, shadcn/ui components, ESLint, and link to Vercel production project `nexus-fnb-bms-plan`.
* **Deliverables:** `src/app/`, `package.json`, `tailwind.config.ts`, `vercel.json`.
* **Verification:** `npm run build` succeeds cleanly with zero type errors; preview deploys on Vercel.
* **Antigravity Delegation Prompt:**
  ```text
  You are the Lead Backend/DevOps Engineer. Initialize a clean Next.js 15 App Router project with TypeScript, Tailwind CSS, Lucide icons, and modern ESLint config. Ensure it builds cleanly with `npm run build` and conforms to Vercel Fluid Compute standards.
  ```

#### TSK-ARCH-02: Neon Serverless Postgres DDL Schema & Drizzle ORM
* **Priority:** Critical | **Estimate:** 3 Days | **Status:** Ready
* **Scope:** Implement the complete `nexus_fnb` relational schema using Drizzle ORM or Prisma for Neon Serverless Postgres. Include tables: `outlets`, `dining_tables`, `menu_items`, `recipe_bom`, `ingredients`, `orders`, `shifts`.
* **Deliverables:** `src/db/schema.ts`, `src/db/migrations/`, `src/db/index.ts`.
* **Verification:** Run migration script against Neon database; verify all tables, foreign keys, and indexes exist.
* **Antigravity Delegation Prompt:**
  ```text
  You are the Database Architect. Implement the complete PostgreSQL DDL schema specified in SSOT.md using Drizzle ORM for Neon Serverless Postgres. Create models for outlets, dining_tables, menu_items, recipe_bom, ingredients, orders, and shifts. Ensure UUID primary keys, check constraints, and migration scripts run cleanly.
  ```

#### TSK-ARCH-03: PWA Service Worker & IndexedDB Offline Outbox Engine
* **Priority:** Critical | **Estimate:** 4 Days | **Status:** Ready
* **Scope:** Build the offline-first Progressive Web App (PWA) engine. Uses browser IndexedDB (`idb` library) to cache menu catalog, table states, and queue offline orders in an `outbox_events` store. Automatically syncs with `/api/sync/push` upon reconnection.
* **Deliverables:** `src/lib/pwa/`, `src/lib/offline/outbox.ts`, `src/lib/offline/sync-daemon.ts`, `public/manifest.json`.
* **Verification:** Disconnect network in DevTools; place an order; verify order is persisted in IndexedDB; reconnect network; verify order automatically syncs to Neon Postgres.
* **Antigravity Delegation Prompt:**
  ```text
  You are the Edge/Offline Resilience Engineer. Build a client-side offline storage and outbox synchronization daemon using IndexedDB. Cache the menu items, table states, and pending orders. Include an idempotent background sync queue that sends pending orders to /api/sync/push when the browser detects online status.
  ```

#### TSK-ARCH-04: Role-Based Access Control (RBAC) & Fast PIN Switch
* **Priority:** High | **Estimate:** 2 Days | **Status:** Ready
* **Scope:** Implement quick 4-digit or 6-digit staff PIN login. Enables cashier switching in under 1 second. Manager overrides (for item cancellation or discounts) require a supervisor PIN with audit logging.
* **Deliverables:** `src/lib/auth/pin-auth.ts`, `src/components/auth/PinPadModal.tsx`.
* **Verification:** Unit tests verifying valid PIN matches role; invalid PIN locks after 3 attempts; manager override logs supervisor ID.
* **Antigravity Delegation Prompt:**
  ```text
  You are the Security & Authentication Engineer. Build a fast 4-digit PIN authentication modal and hook for in-store POS cashiers and managers. Support instant staff switching, session persistence, and supervisor override prompts for void/discount actions.
  ```

---

### Epic 2: Front-of-House (FOH) Dual Operations (Weeks 5–8)

#### TSK-POS-01: FSR Interactive Table Floor Plan Designer
* **Priority:** High | **Estimate:** 4 Days | **Status:** Backlog
* **Scope:** Visual drag-and-drop or grid designer allowing store managers to configure dining rooms (Indoor, Outdoor, VIP, Bar), table shapes (round, square, long), and seating capacities.
* **Deliverables:** `src/components/pos/fsr/FloorPlanEditor.tsx`, `src/components/pos/fsr/TableView.tsx`.
* **Verification:** Table coordinates and layout save to Neon Postgres; responsive on iPad and 15.6" POS displays.
* **Antigravity Delegation Prompt:**
  ```text
  You are the Senior Frontend UI Engineer. Build the Full-Service Restaurant (FSR) interactive table floor plan component in React with Tailwind CSS. Allow viewing and updating table occupancy status (Vacant, Seated, Ordered, Served, Bill Printed) in real time.
  ```

#### TSK-POS-02: FSR Table Tab State & Course Firing Lifecycle
* **Priority:** Critical | **Estimate:** 4 Days | **Status:** Backlog
* **Scope:** State machine managing table seating, open tabs, adding multiple rounds of items (Drink round, Appetizer round, Mains round), and firing kitchen tickets.
* **Deliverables:** `src/lib/pos/tab-state-machine.ts`, `src/components/pos/fsr/ActiveTabDrawer.tsx`.
* **Verification:** State transitions conform to `VACANT` $\rightarrow$ `SEATED` $\rightarrow$ `ORDERED` $\rightarrow$ `SERVED` $\rightarrow$ `BILL_OUT`.
* **Antigravity Delegation Prompt:**
  ```text
  You are the POS Systems Engineer. Build the table tab management state machine for FSR. Support multi-round ordering, line item modifiers, course sequencing (drinks, starters, mains), and kitchen firing triggers.
  ```

#### TSK-POS-03: Bill Split & Merge Calculation Engine
* **Priority:** High | **Estimate:** 3 Days | **Status:** Backlog
* **Scope:** Financial calculation engine supporting: 1) Equal split by N guests, 2) Split by item selection (who ordered what), 3) Merging multiple tables into one bill.
* **Deliverables:** `src/lib/pos/bill-split.ts`, `src/components/pos/BillSplitModal.tsx`.
* **Verification:** Mathematical unit test proving sum of split parts equals exact total bill amount with rounding reconciliation.
* **Antigravity Delegation Prompt:**
  ```text
  You are the FinTech/Frontend Engineer. Build the bill splitting and table merging engine for FSR. Ensure exact penny/sen matching across split checks and calculate 10% Service Charge + 6% SST proportionally.
  ```

#### TSK-POS-04: QSR Rapid Tap Counter Interface
* **Priority:** Critical | **Estimate:** 3 Days | **Status:** Backlog
* **Scope:** High-throughput counter checkout screen engineered for transaction completion under 15 seconds. Large category tiles, fast modifier popups, and instant payment buttons.
* **Deliverables:** `src/components/pos/qsr/RapidOrderMatrix.tsx`, `src/components/pos/qsr/ComboUpsellModal.tsx`.
* **Verification:** User can tap category $\rightarrow$ select item $\rightarrow$ select drink modifier $\rightarrow$ tap Cash/DuitNow in under 6 taps.
* **Antigravity Delegation Prompt:**
  ```text
  You are the QSR UX/UI Engineer. Build the rapid-tap counter ordering screen for Quick-Service Kiosks. Ensure high responsiveness, instant combo modifier selections, and immediate checkout flow.
  ```

#### TSK-POS-05: QSR Queue Token & Calling Display
* **Priority:** Medium | **Estimate:** 2 Days | **Status:** Backlog
* **Scope:** Daily sequential token numbering generator (`#101` to `#999`) and fullscreen Customer Calling web view (`Preparing` vs `Ready for Collection`) with audio chimes.
* **Deliverables:** `src/app/display/queue/page.tsx`, `src/lib/pos/queue-token.ts`.
* **Verification:** Token numbers increment daily; calling display updates in real time via WebSocket or SSE.
* **Antigravity Delegation Prompt:**
  ```text
  You are the Frontend/Display Engineer. Build the customer-facing order queue calling screen for QSR kiosks. Display 'Preparing' and 'Now Calling' columns with visual pulse and sound chimes when a token is bumped from the kitchen.
  ```

#### TSK-POS-06: Mobile Waiter Handheld View (Sunmi V2s)
* **Priority:** Medium | **Estimate:** 3 Days | **Status:** Backlog
* **Scope:** Responsive UI view designed specifically for 5.5-inch Android handheld POS terminals (e.g., Sunmi V2s / iMin M2) for table-side order taking.
* **Deliverables:** `src/app/pos/mobile/page.tsx`, `src/components/pos/mobile/`.
* **Verification:** UI renders without horizontal scroll on 720x1440 viewport; touch targets $\ge 48\text{px}$.
* **Antigravity Delegation Prompt:**
  ```text
  You are the Mobile Web Specialist. Build the compact table-side waiter ordering UI tailored for 5.5-inch handheld Android POS terminals (Sunmi V2s). Optimize for one-handed operation and fast table-side entry.
  ```

---

### Epic 3: Malaysian Statutory & Compliance Engine (Weeks 9–12)

#### TSK-TAX-01: SST & Service Charge Calculation Engine
* **Priority:** Critical | **Estimate:** 2 Days | **Status:** Backlog
* **Scope:** Mathematical calculation engine implementing Malaysian tax rules:
  * FSR: Subtotal + 10% Service Charge + 6% SST applied to subtotal + service charge.
  * QSR: Subtotal + Takeaway Packaging Fee + 6% SST (0% Service Charge).
* **Deliverables:** `src/lib/tax/sst-calculator.ts`, `src/lib/tax/__tests__/sst-calculator.test.ts`.
* **Verification:** 100% test coverage verifying cascading calculations across various discount and promotion scenarios.
* **Antigravity Delegation Prompt:**
  ```text
  You are the Malaysian Tax & Accounting Engineer. Implement the pure TypeScript SST and Service Charge calculation engine. Accurately calculate FSR 10% Service Charge + 6% SST, and QSR 6% SST + packaging fees. Write comprehensive Vitest test cases.
  ```

#### TSK-TAX-02: Bank Negara Malaysia (BNM) 5-Sen Cash Rounding
* **Priority:** Critical | **Estimate:** 1 Day | **Status:** Backlog
* **Scope:** Implement official BNM cash rounding rules strictly for CASH payments: 1–2 sen to 0; 3–7 sen to 5; 8–9 sen to 10. Generate explicit rounding adjustment journal entries. Enforce exact sen for cashless payments.
* **Deliverables:** `src/lib/tax/bnm-rounding.ts`, `src/lib/tax/__tests__/bnm-rounding.test.ts`.
* **Verification:** Test cases for RM10.01, RM10.02, RM10.03, RM10.07, RM10.08, RM10.09.
* **Antigravity Delegation Prompt:**
  ```text
  You are the FinTech Engineer. Build the Bank Negara Malaysia 5-sen cash rounding algorithm in TypeScript. Ensure rounding strictly applies to cash payments while DuitNow/card transactions pay exact sen amounts.
  ```

#### TSK-LHDN-01: LHDN MyInvois API Client & Signature Gateway
* **Priority:** Critical | **Estimate:** 4 Days | **Status:** Backlog
* **Scope:** Client library for LHDN MyInvois REST API (Sandbox & Production). Handles OAuth2 token refresh, payload JSON/UBL XML serialization, and SHA256 document hashing.
* **Deliverables:** `src/lib/lhdn/myinvois-client.ts`, `src/lib/lhdn/types.ts`.
* **Verification:** Successfully authenticate against LHDN Sandbox and validate test document submission.
* **Antigravity Delegation Prompt:**
  ```text
  You are the LHDN Compliance & API Engineer. Build the official LHDN MyInvois API integration client in TypeScript. Implement OAuth2 client credentials authentication, payload schema validation, and SHA-256 digital document hashing.
  ```

#### TSK-LHDN-02: B2C Monthly Consolidated e-Invoice Batch Worker
* **Priority:** High | **Estimate:** 3 Days | **Status:** Backlog
* **Scope:** Vercel Cron scheduled worker that executes on the 1st of every month. Queries all retail transactions without buyer TIN from the previous month, aggregates into consolidated payload, and transmits to LHDN MyInvois.
* **Deliverables:** `src/app/api/cron/lhdn-consolidated/route.ts`, `src/lib/lhdn/consolidated-builder.ts`.
* **Verification:** Trigger cron handler locally; verify batch payload groups thousands of transactions and logs LHDN submission status.
* **Antigravity Delegation Prompt:**
  ```text
  You are the Backend/Batch Processing Engineer. Build the Vercel Cron handler for LHDN B2C Monthly Consolidated e-Invoicing. Query previous month's non-TIN transactions, aggregate line items, serialize into LHDN batch format, and store submission response.
  ```

#### TSK-LHDN-03: B2B Real-Time Validated e-Invoice with Receipt QR Code
* **Priority:** High | **Estimate:** 3 Days | **Status:** Backlog
* **Scope:** Cashier interface for corporate dining customers requesting official tax invoices. Captures buyer TIN, SST Number, and Company Name. Transmits to MyInvois API and prints the returned verification QR code directly on the 80mm thermal receipt.
* **Deliverables:** `src/components/pos/B2BInvoiceModal.tsx`, `src/lib/lhdn/b2b-invoice.ts`.
* **Verification:** Submit sample B2B invoice; receive valid UUID from LHDN; receipt preview generates scannable LHDN QR code.
* **Antigravity Delegation Prompt:**
  ```text
  You are the Full-Stack Compliance Specialist. Build the B2B e-Invoice modal in the POS. Validate buyer TIN format, trigger instant LHDN validation via server action, and return the official verification URL to be rendered as a QR code on thermal receipts.
  ```

---

### Epic 4: Hardware & ESC/POS Thermal Printing (Weeks 13–16)

#### TSK-PRT-01: Raw ESC/POS Socket Driver Utility
* **Priority:** Critical | **Estimate:** 3 Days | **Status:** Backlog
* **Scope:** Low-level utility to generate raw ESC/POS byte commands (text formatting, bold, double height, line feeds, cutter pulses, QR codes). Communicates directly over TCP port 9100.
* **Deliverables:** `src/lib/hardware/escpos-builder.ts`, `src/lib/hardware/tcp-socket.ts`.
* **Verification:** Send raw byte array to LAN thermal printer; printer prints test ticket and cuts paper without opening OS print dialog.
* **Antigravity Delegation Prompt:**
  ```text
  You are the Hardware/IoT Driver Specialist. Build the raw ESC/POS command builder in TypeScript. Implement commands for text alignment, emphasis, double-width/height, barcode/QR code generation, paper cut, and cash drawer kick pulse.
  ```

#### TSK-PRT-02: Multi-Station Kitchen Ticket Router
* **Priority:** Critical | **Estimate:** 3 Days | **Status:** Backlog
* **Scope:** Station routing service that inspects ordered items and dispatches separate tickets to Hot Kitchen, Cold Larder, and Drink Bar printers based on the item's `kitchen_station` attribute.
* **Deliverables:** `src/lib/hardware/ticket-router.ts`.
* **Verification:** Order with 1 Steak, 1 Salad, 1 Teh Tarik sends 1 ticket to Hot Wok, 1 to Cold Prep, and 1 to Drink Bar.
* **Antigravity Delegation Prompt:**
  ```text
  You are the Hardware Integration Engineer. Implement the multi-station kitchen ticket routing service. Take an order with line items, group items by assigned kitchen station, format individual kitchen tickets with modifiers, and dispatch to designated station IP addresses.
  ```

#### TSK-PRT-03: 80mm Tax Receipt Formatter with LHDN QR
* **Priority:** High | **Estimate:** 2 Days | **Status:** Backlog
* **Scope:** Standard 80mm customer receipt formatter containing: Outlet Header, SST Number, Order ID, Date/Time, Line items, Subtotal, 10% Service Charge, 6% SST, BNM 5-sen rounding adjustment, and LHDN MyInvois QR code.
* **Deliverables:** `src/lib/hardware/receipt-formatter.ts`.
* **Verification:** Receipt layout conforms strictly to Malaysian Customs and LHDN receipt formatting standards.
* **Antigravity Delegation Prompt:**
  ```text
  You are the Hardware/POS Receipt Designer. Build the 80mm thermal receipt formatter complying with Malaysian Customs and LHDN requirements. Include outlet details, SST ID, line items, service charge, SST breakdown, cash rounding, and the LHDN verification QR code.
  ```

#### TSK-PRT-04: Cash Drawer RJ11 Kick Pulse Trigger
* **Priority:** High | **Estimate:** 1 Day | **Status:** Backlog
* **Scope:** Sends the ESC/POS cash drawer kick pulse (`10 14 01 00 05` or `ESC p 0 25 250`) to the receipt printer's RJ11 port upon cash settlement or authorized manager manual open.
* **Deliverables:** `src/lib/hardware/cash-drawer.ts`.
* **Verification:** Hardware test triggers cash drawer solenoid latch release.
* **Antigravity Delegation Prompt:**
  ```text
  You are the Hardware IoT Engineer. Write the cash drawer trigger module. Send the standard 24V RJ11 kick pulse via the receipt printer upon cash payment completion, with audit logging for manual opens.
  ```

---

### Epic 5: Inventory, Halal & Shift Management

#### TSK-INV-01: Recipe Bill of Materials (BOM) & Costing Engine
* **Priority:** High | **Estimate:** 4 Days | **Status:** Backlog
* **Scope:** Hierarchical recipe builder breaking down menu items into raw ingredients with yield percentages and wastage allowances. Dynamically calculates food cost percentage against ingredient purchase costs.
* **Deliverables:** `src/lib/inventory/bom-calculator.ts`, `src/components/inventory/RecipeEditor.tsx`.
* **Verification:** Food cost updates automatically when raw ingredient wholesale cost changes.
* **Antigravity Delegation Prompt:**
  ```text
  You are the Supply Chain & Inventory Engineer. Build the Recipe BOM and Food Costing calculation module. Calculate unit ingredient costs with wastage allowance, compute total recipe cost, and display gross margin and food cost percentage.
  ```

#### TSK-INV-02: Real-Time Stock Depletion Engine
* **Priority:** High | **Estimate:** 3 Days | **Status:** Backlog
* **Scope:** Database function / server action that decrements raw ingredient inventory balances in Neon Postgres when an order is paid. Dispatches low-stock alerts when safety thresholds are breached.
* **Deliverables:** `src/lib/inventory/stock-depletion.ts`.
* **Verification:** Order of 10 Burgers decrements 10 Buns, 1.5kg Beef Patty, 200g Lettuce from ingredient balances.
* **Antigravity Delegation Prompt:**
  ```text
  You are the Backend/Database Engineer. Implement the real-time inventory depletion engine. When an order completes, resolve its menu items through recipe BOM and decrement ingredient stock levels in an atomic transaction.
  ```

#### TSK-HAL-01: JAKIM Halal Certification Registry
* **Priority:** High | **Estimate:** 2 Days | **Status:** Backlog
* **Scope:** Database registry and UI tracking supplier Halal certificates, issuing Islamic bodies (JAKIM, MUIS, etc.), and certificate expiry dates. Vercel Cron triggers 60-day and 30-day renewal warnings.
* **Deliverables:** `src/app/admin/halal/page.tsx`, `src/app/api/cron/halal-check/route.ts`.
* **Verification:** System flags expired or expiring certificates; sends email and dashboard notification.
* **Antigravity Delegation Prompt:**
  ```text
  You are the Compliance & Admin Engineer. Build the JAKIM Halal Certification registry and monitoring page. Support document upload to Vercel Blob and implement a cron check that flags certificates expiring within 60 days.
  ```

#### TSK-HAL-02: Staff Typhoid Injection & Food Handler Training Records
* **Priority:** High | **Estimate:** 2 Days | **Status:** Backlog
* **Scope:** Staff health compliance module tracking mandatory 3-year typhoid injection dates (*Suntikan Tifoid*) and certified Food Handler Training certificates for municipal council (PBT) inspections.
* **Deliverables:** `src/app/admin/staff-health/page.tsx`.
* **Verification:** Health record dashboard displays green (valid), yellow (expiring <90d), red (expired) badges per staff member.
* **Antigravity Delegation Prompt:**
  ```text
  You are the HR & Operations Compliance Engineer. Build the staff health registry tracking typhoid injection dates and food handler training certificates. Include status badges and upcoming expiry filters for council inspection readiness.
  ```

#### TSK-PAY-01: Dynamic DuitNow QR Code Generator (CFD)
* **Priority:** Critical | **Estimate:** 4 Days | **Status:** Backlog
* **Scope:** Integrates with PayNet acquirer API (Curlec / Revenue Monster) to generate a dynamic DuitNow QR containing exact payable total on the Customer Facing Display (CFD). Automatically updates order status upon webhook callback.
* **Deliverables:** `src/components/pos/CustomerFacingDisplay.tsx`, `src/app/api/webhooks/duitnow/route.ts`.
* **Verification:** Dynamic QR encodes exact amount; webhook payload triggers POS payment completion and receipt printing.
* **Antigravity Delegation Prompt:**
  ```text
  You are the FinTech Payment Rails Engineer. Implement the dynamic DuitNow QR generator on the Customer Facing Display. Connect to payment gateway API, render QR with exact order total, and listen for webhook confirmation.
  ```

#### TSK-PAY-02: Cash Float, Shift Management & X/Z Reports
* **Priority:** High | **Estimate:** 3 Days | **Status:** Backlog
* **Scope:** Cashier shift opening float declaration, midway X-Report snapshot (without closing shift), and end-of-day Z-Report ledger closure. Calculates cash variance (expected vs actual drawer count).
* **Deliverables:** `src/components/pos/ShiftModal.tsx`, `src/lib/reports/z-report.ts`.
* **Verification:** Z-Report prints summary of Cash, DuitNow, Cards, SST collected, Service Charge, and cash discrepancies; locks shift from further edits.
* **Antigravity Delegation Prompt:**
  ```text
  You are the Financial Reporting Specialist. Build the shift management and X/Z Report generation module. Allow opening float input, midway cash drop, and end-of-shift cash drawer reconciliation with variance auditing.
  ```
