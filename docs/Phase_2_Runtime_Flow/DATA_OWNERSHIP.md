# 2.1 Data Ownership & Write-Access Map

| Entity/Table | Owner Module | Read Consumers | Notes |
| :--- | :--- | :--- | :--- |
| **Orders** (`local-orders.json`) | `api/local-orders.js` | `KOT Dashboard`, `Order Status`, `Manual Orders` | ⚠️ **MAJOR VIOLATION**: Written by BOTH API (filesystem) AND `localDataService` (IndexedDB). `ordersStore-unified.js` tries to sync but race conditions exist. |
| **Orders** (`localforage:orders_v1`) | `localDataService.js` | `Admin Panel`, `Cart`, `Bill`, `Manual Orders` | ⚠️ **Split Brain**: Primary source for Admin/Cart, but `api/local-orders` is primary for KOT. Sync is fragile. |
| **Menu / Products** (`localforage:menu_v1`) | `localDataService.js` | `Admin Panel`, `Manual Orders`, `Cart` | ✅ Clean ownership (Browser-only). `admin-unified.js` and `ProductEditModal` write via this service. |
| **Offers** (`localforage:offers_v1`) | `localDataService.js` | `Admin Panel`, `Cart`, `Bill` | ✅ Clean ownership (Browser-only). Written by `admin-offers.js`. |
| **Shop Status** (`localforage:shop_v1`) | `localDataService.js` | `Admin Panel` | ✅ Clean ownership (Browser-only). |
| **User/Auth** | `N/A` | `admin-login.js` | ⚠️ **No Database**: Passwords hardcoded in `.env` / source. No user table exists. |

## 🔍 Key Observations

1.  **Dual Order Databases**: The system maintains TWO separate order databases:
    *   **Browser (IndexedDB):** Used by Admin, Cart, and Billing.
    *   **Server (JSON File):** Used by KOT Dashboard and API routes.
    *   *Violation:* `localDataService` attempts to sync by pushing to API, but `api/local-orders.js` writes directly to disk.

2.  **Logic Scattered in UI**:
    *   `KOTTab-corrupted.jsx` contains direct write logic attempting to sync back to `localDataService`.
    *   `manual-order-complete.js` writes orders directly using `upsertLocalOrder`.

3.  **No True Backend**:
    *   For Menu, Offers, and Shop Status, there is **zero server-side persistence**. If the browser cache clears, this data is lost.
    *   Only `Orders` have file-system persistence via the API.
