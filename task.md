# System Restructuring Plan

## Phase 2 — Runtime Flow Analysis

This phase focuses on understanding how the system behaves at runtime: ownership of data, module dependencies, and request flows.

### [x] 2.1 Data Ownership & Write-Access Map
   - **Goal:** Identify the "True Owner" of each data entity and detect write-violations.
   - [x] Identify Core Entities (Orders, Products, Offers, Shop Status).
   - [x] Trace Write Operations (Database/File Writes).
   - [x] Map violations (e.g., dual writer problem for Orders).

### [x] 2.2 Module Dependency Mapping
   - **Goal:** Map the coupling between modules (Service-to-Service communication).
   - [x] Trace Cross-Module Imports.
   - [x] Trace Synchronous Calls (Tight Coupling).
   - [x] Trace Asynchronous Calls / Events (Loose Coupling).
   - [x] Document in `MODULE_DEPENDENCIES.md`.

### [x] 2.3 'God File' Dependency Graph
   - **Goal:** Deconstruct `admin-unified.js` and `main.js`.
   - [x] Map internal component tree of `admin-unified.js`.
   - [x] Map responsibility clusters in `main.js`.
   - [x] Document in `GOD_FILE_ANALYSIS.md`.

## Phase 3 — Structural Refactoring

### [x] 3.0 Refactoring Strategy & Blueprint
   - **Goal:** Strict blueprint for extracting services.
   - [x] Create `docs/Phase_3_Refactoring/PLAN.md`.

### [ ] 3.1 Decouple `main.js` (Printer & Shortcuts)
   - **Goal:** Extract massive logic blocks into specialized services.
   - [x] Create `electron/services/PrinterService.js` (ESC/POS Logic).
   - [x] Integrate Service & Fix Imports.
   - [x] Create `electron/managers/ShortcutManager.js`.
   - [x] Create `electron/managers/ServerManager.js` (Next.js Spawn).
   - [x] Refactor `main.js` to import these services.

### [ ] 3.2 Decouple `admin-unified.js` (Routes)
   - **Goal:** Split the monolithic controller into 3 distinct pages.
   - [ ] Create `/pages/admin/products.js`.
   - [ ] Create `/pages/admin/offers.js`.
   - [ ] Slim down `/pages/admin-unified.js` to only handle Orders.
