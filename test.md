# Phase 3: Deliverable Verification Tests

## 📍 WHERE ARE YOU? (Context)
* **Master Deliverable:** 3 — Decoupling God Files
* **Sub Deliverable:** 3.1 & 3.2 — Route Separation & Main.js Decoupling
* **Phase:** 3 — Structural Refactoring
* **Work Package:** Validation Checkpoint
* **Current Branch:** `refactor` (Testing integration branch)

---

## 🧪 MANUAL VERIFICATION CHECKLIST

### 1. Test the Order Flow (`admin-unified.js`)
* [ ] Go to the Orders dashboard (Home).
* [ ] Verify active orders are displaying correctly.
* [ ] Verify you can click an order to expand its details.
* [ ] Verify status buttons (Ready, Paid, Cancel) still update the order correctly.

### 2. Test the New Product Route (`/admin/products`)
* [ ] Click the "Products" tab on the sidebar.
* [ ] Verify it successfully navigates to the new `products.js` page.
* [ ] Verify the Menu data loads.
* [ ] Verify you can successfully toggle a chicken item's availability.
* [ ] Verify you can edit a product price and save it.

### 3. Test the New Offers Route (`/admin-offers`)
* [ ] Click the "Offers" tab on the sidebar.
* [ ] Verify it successfully navigates to the offers page.
* [ ] Verify you can view current offer rules.
* [ ] Verify you can open the modal to create a new offer rule.

### 4. Test the Core Electron Services (`main.js` decoupling)
* [ ] **Keyboard Service:** Press `Shift+P` (Should attempt to print the latest order).
* [ ] **Keyboard Service:** Press `Shift+A` (Should toggle shop open/close status).
* [ ] **Printer Service:** Ensure a receipt can physically print, or check the terminal output for a successful print command log.

---

**Next Step:** Once all boxes above are checked `[x]`, we can confidently move forward to Phase 4 (Database & Service Layer Consolidation).
