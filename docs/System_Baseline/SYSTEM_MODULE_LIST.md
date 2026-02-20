# 📦 SYSTEM MODULE LIST — RMS (Beyon-desk)

> **Phase 1 · Sub-Deliverable 1.1 — System Overview Map**
> Generated: 2026-02-19 · Status: ✅ Complete

---

## System Tree

```
RMS (Beyon-desk)
│
├── 🏪 Admin Panel ─────────── Provides the unified back-office dashboard for managing orders, products, KOTs, and shop settings.
│
├── 🍳 KOT (Kitchen Order Ticket) ── Manages the kitchen-side order queue, station views, progress tracking, and order completion flow.
│
├── 🛒 Cart & Billing ─────── Handles the customer-facing cart, bill calculation, receipt generation, and order confirmation.
│
├── 📝 Manual Orders ────────── Enables staff to create, edit, and complete walk-in or phone orders manually.
│
├── 🎁 Offers & Promotions ── Manages discount rules, active/historical offers, and applies promotional pricing logic.
│
├── 📦 Order Management ────── Tracks the full order lifecycle: placement, status updates, filtering, and unified order data access.
│
├── 🔐 Auth ─────────────────── Provides admin login/authentication gating for protected back-office routes.
│
├── 🗃️ Database & Storage ──── Handles local IndexedDB initialization, schema definitions, and persistent data read/write operations.
│
├── 📡 Data Services ────────── Provides the local data service layer for CRUD operations on orders, products, and menu data.
│
├── 🍔 Product / Menu ────────── Manages the menu catalog: item display, detail pages, category filtering, and image mapping.
│
├── 🖥️ Electron Shell ────────── Wraps the Next.js app as a desktop application with native window management, printing, and auto-update support.
│
├── ⌨️ Keyboard Shortcuts ──── Registers and dispatches global keyboard shortcuts for rapid admin navigation and actions.
│
├── 🛠️ Utilities ─────────────── Shared helpers for API calls, slug generation, order normalization, and tab filtration logic.
│
├── 🧪 Testing ──────────────── Contains unit tests (Jest) and end-to-end tests (Playwright) for hooks and user flows.
│
└── 🔧 Build & Deployment ──── Build scripts, Electron packaging, Capacitor config, and installer generation for desktop/mobile targets.
```

---

## Detailed Module Breakdown

### 🏪 Admin Panel
| Attribute | Detail |
|---|---|
| **Responsibility** | Provides the unified back-office dashboard for managing orders, products, KOTs, and shop settings. |
| **Key Locations** | `pages/admin-unified.js`, `components/admin/`, `hooks/admin/` |
| **Sub-Modules** | OrdersTab, ProductsTab, KOTTab, AdminLayout, AdminHeader, OffersPanel, OrderRow, ProductEditModal |
| **Complexity** | ⚠️ **Complex** — `admin-unified.js` is 22 KB; a legacy 90 KB backup exists; duplicated in `pages/pages/`. |

---

### 🍳 KOT (Kitchen Order Ticket)
| Attribute | Detail |
|---|---|
| **Responsibility** | Manages the kitchen-side order queue, station views, progress tracking, and order completion flow. |
| **Key Locations** | `pages/kot-dashboard.js`, `components/kot/`, `models/kotModel.js` |
| **Sub-Modules** | KOTDashboard, KOTDetail, KOTOrders, KOTQueue, KOTStation, KOTProgressBar |
| **Complexity** | ⚠️ **Complex** — 6 components totalling ~80 KB; corrupted/old tab files in `admin/tabs/`. |

---

### 🛒 Cart & Billing
| Attribute | Detail |
|---|---|
| **Responsibility** | Handles the customer-facing cart, bill calculation, receipt generation, and order confirmation. |
| **Key Locations** | `pages/cart.js`, `pages/bill.js`, `pages/print-receipt.js`, `pages/order-confirmation.js`, `components/CartScreen.jsx` |
| **Sub-Modules** | CartScreen, Receipt, BillModal (manual-order), useBillCalculation hook |
| **Complexity** | Moderate — `bill.js` is 50 KB, suggesting mixed concerns. |

---

### 📝 Manual Orders
| Attribute | Detail |
|---|---|
| **Responsibility** | Enables staff to create, edit, and complete walk-in or phone orders manually. |
| **Key Locations** | `pages/manual-orders.js`, `pages/manual-order-complete.js`, `components/manual-order/` |
| **Sub-Modules** | ItemsGrid, CartSheet, BillModal, OfferBadge, manualOrderHelpers utility |
| **Complexity** | ⚠️ **Complex** — `manual-order-complete.js` is 50 KB+; duplicated in `pages/pages/` at 67 KB. |

---

### 🎁 Offers & Promotions
| Attribute | Detail |
|---|---|
| **Responsibility** | Manages discount rules, active/historical offers, and applies promotional pricing logic. |
| **Key Locations** | `pages/admin-offers.js`, `pages/admin-offers-current.js`, `pages/admin-offers-history.js`, `utils/offersEngine.js` |
| **Sub-Modules** | OffersPanel (admin component), TestOffer component, offers data JSONs |
| **Complexity** | Moderate — `admin-offers.js` is 35 KB; three separate offer pages suggest partial duplication. |

---

### 📦 Order Management
| Attribute | Detail |
|---|---|
| **Responsibility** | Tracks the full order lifecycle: placement, status updates, filtering, and unified order data access. |
| **Key Locations** | `hooks/useFilteredOrders.js`, `hooks/useUnifiedOrderData.js`, `hooks/useCartManagement.js`, `models/Order.js`, `data/ordersStore-unified.js` |
| **Sub-Modules** | OrderDataContext, order-status page, check-order-status page, local-orders API |
| **Complexity** | Moderate — Data flows through hooks, context, and a local store; `useFilteredOrders` is ~9 KB. |

---

### 🔐 Auth
| Attribute | Detail |
|---|---|
| **Responsibility** | Provides admin login/authentication gating for protected back-office routes. |
| **Key Locations** | `pages/admin-login.js` |
| **Sub-Modules** | None detected |
| **Complexity** | Simple — Single 2.7 KB file; no token/session management layer observed. |

---

### 🗃️ Database & Storage
| Attribute | Detail |
|---|---|
| **Responsibility** | Handles local IndexedDB initialization, schema definitions, and persistent data read/write operations. |
| **Key Locations** | `src/database.js`, `src/databaseInit.js`, `src/schemas.js`, `src/StorageMonitor.js` |
| **Sub-Modules** | StorageMonitor (clean + old versions) |
| **Complexity** | Moderate — Old/backup files present (`StorageMonitor.js.old`); indicates in-progress rework. |

---

### 📡 Data Services
| Attribute | Detail |
|---|---|
| **Responsibility** | Provides the local data service layer for CRUD operations on orders, products, and menu data. |
| **Key Locations** | `src/localDataService.js`, `lib/data-normalizer.js`, `lib/react-query.js`, `data/*.json` |
| **Sub-Modules** | localDataService (clean + old + backup versions), data-normalizer |
| **Complexity** | ⚠️ **Complex** — `localDataService.js` is 14 KB with multiple backup/old copies signaling active churn. |

---

### 🍔 Product / Menu
| Attribute | Detail |
|---|---|
| **Responsibility** | Manages the menu catalog: item display, detail pages, category filtering, and image mapping. |
| **Key Locations** | `pages/item/[slug].js`, `pages/index.js`, `components/admin/products/`, `hooks/useSearchAndCategory.js`, `utils/imageMap.js` |
| **Sub-Modules** | ProductCard, ProductToolbar, useAdminProducts, useAdminProductsEnhanced, menuData.json |
| **Complexity** | Moderate — Split across admin products management and customer-facing menu display. |

---

### 🖥️ Electron Shell
| Attribute | Detail |
|---|---|
| **Responsibility** | Wraps the Next.js app as a desktop application with native window management, printing, and auto-update support. |
| **Key Locations** | `electron/main.js`, `electron/preload.js`, `electron/installer.nsh` |
| **Sub-Modules** | Preload bridge, NSIS installer script, icon assets |
| **Complexity** | ⚠️ **Complex** — `main.js` is 42 KB, indicating a heavy Electron layer with many native integrations. |

---

### ⌨️ Keyboard Shortcuts
| Attribute | Detail |
|---|---|
| **Responsibility** | Registers and dispatches global keyboard shortcuts for rapid admin navigation and actions. |
| **Key Locations** | `src/shortcutHandler.js`, `hooks/admin/useAdminKeyboardShortcuts.js` |
| **Sub-Modules** | None |
| **Complexity** | Moderate — 13 KB handler + 9 KB hook; tightly coupled to admin panel. |

---

### 🛠️ Utilities
| Attribute | Detail |
|---|---|
| **Responsibility** | Shared helpers for API calls, slug generation, order normalization, and tab filtration logic. |
| **Key Locations** | `utils/api.js`, `utils/slug.js`, `utils/tabFiltrationLogic.js`, `helpers/adminFormatters.js`, `helpers/normalizeOrder.js` |
| **Sub-Modules** | imageOverrides utility |
| **Complexity** | Simple — Small, focused utility files. |

---

### 🧪 Testing
| Attribute | Detail |
|---|---|
| **Responsibility** | Contains unit tests (Jest) and end-to-end tests (Playwright) for hooks and user flows. |
| **Key Locations** | `beyon79/__tests__/`, `tests/` (root), `playwright.config.js`, `jest.config.js` |
| **Sub-Modules** | useFilteredOrders test, kot-flow e2e spec |
| **Complexity** | Simple — Minimal test coverage currently; mostly scaffolding. |

---

### 🔧 Build & Deployment
| Attribute | Detail |
|---|---|
| **Responsibility** | Build scripts, Electron packaging, Capacitor config, and installer generation for desktop/mobile targets. |
| **Key Locations** | `build.bat`, `build.ps1`, `build-installer.ps1`, `install.ps1`, `capacitor.config.json`, `scripts/` |
| **Sub-Modules** | Icon generators, dev port scripts, PACKAGING.md docs |
| **Complexity** | Moderate — Multiple build entry points (bat, ps1); Android + Desktop targets. |

---

## 🔍 Observations & Flags

### ⚠️ Legacy / Unclear Items
| Item | Location | Flag |
|---|---|---|
| Nested `pages/pages/` directory | `beyon79/pages/pages/` | 🔴 **Legacy** — Full duplicate of outer pages with diverged file sizes |
| `admin-unified-backup.js` (90 KB) | `pages/` | 🟡 Legacy backup — superseded by current 22 KB version |
| `admin-unified.txt` (107 KB) | `pages/` | 🟡 Unclear — Text dump of old admin code |
| `.old` / `.backup` files in `src/` | `src/localDataService.js.old`, etc. | 🟡 Legacy — Old versions not cleaned up |
| `KOTTab-corrupted.jsx` | `components/admin/tabs/` | 🔴 Corrupted file still in tree |
| `beyon79/scripts/` (chicken scripts) | `scripts/check_chicken_status.js`, etc. | 🟡 Unclear — Domain-specific scripts with no clear module home |

### ✅ Coverage Check
| System Area | Covered? | Module |
|---|---|---|
| Inventory / Products | ✅ | Product / Menu |
| Orders | ✅ | Order Management, Cart & Billing |
| Auth | ✅ | Auth (minimal) |
| Reporting | ⚠️ **Partial** | No dedicated reporting module; order history exists within Admin Panel |
| Admin | ✅ | Admin Panel |
| Kitchen / KOT | ✅ | KOT |
| Offers / Promotions | ✅ | Offers & Promotions |
| Desktop App | ✅ | Electron Shell |

### ✅ Clarity Check
| Module | One-sentence explainable? |
|---|---|
| Admin Panel | ⚠️ Complex — Multi-tab dashboard with mixed concerns |
| KOT | ⚠️ Complex — Large component surface area |
| Cart & Billing | ⚠️ Complex — `bill.js` may have mixed responsibilities |
| Manual Orders | ⚠️ Complex — Single 50 KB+ page file |
| Offers & Promotions | ✅ Clear |
| Order Management | ✅ Clear |
| Auth | ✅ Clear |
| Database & Storage | ✅ Clear |
| Data Services | ⚠️ Complex — Multiple file versions indicate churn |
| Product / Menu | ✅ Clear |
| Electron Shell | ⚠️ Complex — Heavy `main.js` |
| Keyboard Shortcuts | ✅ Clear |
| Utilities | ✅ Clear |
| Testing | ✅ Clear |
| Build & Deployment | ✅ Clear |
