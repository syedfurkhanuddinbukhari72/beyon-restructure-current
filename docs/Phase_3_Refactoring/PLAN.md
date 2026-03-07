# Phase 3: Structural Refactoring Plan

## 🎯 Objective
Physically restructure the codebase to eliminate "God Files" (`main.js`, `admin-unified.js`) and enforce Separation of Concerns (SoC). This will reduce brittleness and enable modular development.

## 🏗️ Work Package 3.1: Decoupling `main.js` (Electron Process)

The `main.js` file currently handles Window Management, Printer Spooling, Shortcuts, and Server Spawning. We will extract 3 distinct services.

### [x] Step 1: Extract `PrinterService`
*   **Source:** `printReceiptJob`, `printWithEscPos`, `printWithTcpEscPos` logic in `main.js`.
*   **Destination:** `electron/services/PrinterService.js`.
*   **Action:** Move all ESC/POS library references and socket logic here. Expose a clean `printOrder(order)` API.
*   **Verification:** Verify receipts still print via USB/Network.

### [x] Step 2: Extract `ShortcutManager`
*   **Source:** `globalShortcut.register` calls and `lastMPress` debouncing logic.
*   **Destination:** `electron/managers/ShortcutManager.js`.
*   **Action:** Encapsulate key registration and IPC sending (`mainWindow.webContents.send`).
*   **Verification:** Test `Shift+A`, `Shift+P`, and `Shift+Enter` still work.

### [x] Step 3: Extract `ServerManager`
*   **Source:** The child process spawning logic (Lines 220-330).
*   **Destination:** `electron/managers/ServerManager.js`.
*   **Action:** Move the port scanning and `spawn('node', [server.js])` logic here.
*   **Verification:** Ensure app still boots in Production mode.

### [x] Step 4: Clean `main.js`
*   **Action:** Import the above services. `main.js` should only handle Window Creation and Lifecycle events (`app.on('ready')`).

---

## 🏗️ Work Package 3.2: Decoupling `admin-unified.js` (Frontend Monolith)

The `admin-unified.js` file acts as a massive controller for Orders, Products, and Offers. We will split it into distinct Next.js Routes.

### [x] Step 1: Route Audit & Shared Components
*   **Task:** Ensure `AdminLayout` and `OrderDataProvider` can wrap individual pages without `admin-unified.js` control.
*   **Task:** Ensure `useAdminState` logic can be split or migrated.

### [x] Step 2: Create `/admin/products` Route
*   **Source:** `components/admin/tabs/ProductsTab.js` + `useAdminProducts` hook.
*   **Destination:** `pages/admin/products/index.js` (Implemented as `pages/admin/products.js`).
*   **Action:** Move the "Products" tab content to its own URL.
*   **Benefit:** Unloads heavy product logic (chicken toggles, stock management) from the Order Dashboard.

### [x] Step 3: Create `/admin/offers` Route
*   **Source:** `components/admin/OffersPanel.js` + `useAdminOffers` hook.
*   **Destination:** `pages/admin-offers.js` (Existing file optimized).
*   **Action:** Move the "Offers" tab content to its own URL.

### [x] Step 4: Slim Down `admin-unified.js`
*   **Action:** Remove `ProductsTab`, `OffersPanel`, and their associated hooks.
*   **Result:** `admin-unified.js` becomes purely the **Order Management Dashboard**.

---

## 🛡️ Risk Mitigation Strategy
1.  **Backup:** Run `git commit` before each Step.
2.  **Validation:** Test "Critical Path" (Order Creation -> Printing) after every extraction.
3.  **Rollback:** If `main.js` breaks, revert immediately. It is the bootloader.

---

## 🏗️ Phase 4: Database & Service Layer Consolidation

The `localDataService.js` file handles all file-based database operations (Orders, Menu, Offers, Config). We will extract these into localized domain services.

### Work Package 4.1: Refactor `localDataService.js`
*   **Goal:** Break apart the monolithic generic data service.
*   **Step 1:** Audit `localDataService.js` to identify exactly which functions belong to which domain.
*   **Step 2:** Scaffold `src/services/` directory.
*   **Step 3:** Extract logic into `OrderService.js`, `ProductService.js`, `OfferService.js`, and `ConfigService.js`.
*   **Step 4:** Safely update imports across the codebase to point to the new domain services.
*   **Step 5:** Delete the deprecated `localDataService.js`.
