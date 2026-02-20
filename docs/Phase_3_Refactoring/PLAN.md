# Phase 3: Structural Refactoring Plan

## 🎯 Objective
Physically restructure the codebase to eliminate "God Files" (`main.js`, `admin-unified.js`) and enforce Separation of Concerns (SoC). This will reduce brittleness and enable modular development.

## 🏗️ Work Package 3.1: Decoupling `main.js` (Electron Process)

The `main.js` file currently handles Window Management, Printer Spooling, Shortcuts, and Server Spawning. We will extract 3 distinct services.

### [ ] Step 1: Extract `PrinterService`
*   **Source:** `printReceiptJob`, `printWithEscPos`, `printWithTcpEscPos` logic in `main.js`.
*   **Destination:** `electron/services/PrinterService.js`.
*   **Action:** Move all ESC/POS library references and socket logic here. Expose a clean `printOrder(order)` API.
*   **Verification:** Verify receipts still print via USB/Network.

### [ ] Step 2: Extract `ShortcutManager`
*   **Source:** `globalShortcut.register` calls and `lastMPress` debouncing logic.
*   **Destination:** `electron/managers/ShortcutManager.js`.
*   **Action:** Encapsulate key registration and IPC sending (`mainWindow.webContents.send`).
*   **Verification:** Test `Shift+A`, `Shift+P`, and `Shift+Enter` still work.

### [ ] Step 3: Extract `ServerManager`
*   **Source:** The child process spawning logic (Lines 220-330).
*   **Destination:** `electron/managers/ServerManager.js`.
*   **Action:** Move the port scanning and `spawn('node', [server.js])` logic here.
*   **Verification:** Ensure app still boots in Production mode.

### [ ] Step 4: Clean `main.js`
*   **Action:** Import the above services. `main.js` should only handle Window Creation and Lifecycle events (`app.on('ready')`).

---

## 🏗️ Work Package 3.2: Decoupling `admin-unified.js` (Frontend Monolith)

The `admin-unified.js` file acts as a massive controller for Orders, Products, and Offers. We will split it into distinct Next.js Routes.

### [ ] Step 1: Route Audit & Shared Components
*   **Task:** Ensure `AdminLayout` and `OrderDataProvider` can wrap individual pages without `admin-unified.js` control.
*   **Task:** Ensure `useAdminState` logic can be split or migrated.

### [ ] Step 2: Create `/admin/products` Route
*   **Source:** `components/admin/tabs/ProductsTab.js` + `useAdminProducts` hook.
*   **Destination:** `pages/admin/products/index.js`.
*   **Action:** Move the "Products" tab content to its own URL.
*   **Benefit:** Unloads heavy product logic (chicken toggles, stock management) from the Order Dashboard.

### [ ] Step 3: Create `/admin/offers` Route
*   **Source:** `components/admin/OffersPanel.js` + `useAdminOffers` hook.
*   **Destination:** `pages/admin/offers/index.js`.
*   **Action:** Move the "Offers" tab content to its own URL.

### [ ] Step 4: Slim Down `admin-unified.js`
*   **Action:** Remove `ProductsTab`, `OffersPanel`, and their associated hooks.
*   **Result:** `admin-unified.js` becomes purely the **Order Management Dashboard**.

---

## 🛡️ Risk Mitigation Strategy
1.  **Backup:** Run `git commit` before each Step.
2.  **Validation:** Test "Critical Path" (Order Creation -> Printing) after every extraction.
3.  **Rollback:** If `main.js` breaks, revert immediately. It is the bootloader.
