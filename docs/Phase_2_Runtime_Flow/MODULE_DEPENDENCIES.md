# 2.2 Module Dependency Map

| Caller Module | Called Module | Interaction Type (Sync/Async) | Notes / Risk Level |
| :--- | :--- | :--- | :--- |
| **Admin Unified** (`admin-unified.js`) | **Data Service** (`localDataService`) | Sync (Direct Import) | ⚠️ High coupling. Admin directly depends on the specific implementation of local storage logic. |
| **Cart** (`cart.js`) | **Data Service** (`localDataService`) | Async (Dynamic Import) | Clean. Uses `await import()` to load offers rules. Good practice for splitting code. |
| **Cart** (`cart.js`) | **Offers Engine** (`offersEngine.js`) | Sync (Direct Import) | Logic coupling. Cart directly calculates totals/offers using a utility helper. |
| **Manual Orders** (`manual-orders.js`) | **Bill Page** (`bill.js`) | Sync (Router Push + LocalStorage) | ⚠️ Hidden coupling. Passes data via `localStorage.setItem("manual_latest_order")` before routing. Fragile. |
| **KOT Dashboard** (`kot-dashboard.js`) | **KOT Model** (`kotModel.js`) | Sync (Direct Import) | Tightly coupled to KOT status definitions and helper classes. |
| **Admin Tabs** (`KOTTab.jsx`) | **Admin Page** (`admin-unified.js`) | Callback Props (`onLocalOrderUpdate`) | ⚠️ Circular Risk. `admin-unified` passes update handlers DOWN to tabs, which call them to update `admin-unified` state. |
| **Global** | **Data JSONs** (`data/*.json`) | Sync (Direct Import) | 🛑 **CRITICAL RISK:** Multiple files (`admin-offers.js`, `cart.js`) import JSON files directly. If these move, the app breaks. |

## 🔍 Key Observations

1.  **Frontend-Backend Blur**:
    *   `admin-unified.js` acts as a "God Component", importing essentially *everything* (Order Context, Hooks, Tabs, Data Service). It serves as the de-facto Controller for the entire Admin app.
    *   `localDataService.js` is the "shadow backend", utilized by almost every major feature (Admin, Cart, Manual Orders).

2.  **Hidden Coupling via LocalStorage**:
    *   `Manual Orders` -> `Bill` communication happens via `localStorage`. This is an implicit dependency that is hard to track statically.
    *   `Cart` -> `Order Confirmation` also relies on `localStorage` state persistence.

3.  **Direct JSON Imports**:
    *   The code frequently imports `../data/menuData.json` or `orders.json` directly. This creates a hard dependency on the file system structure of the *source code*, not just the runtime environment.
