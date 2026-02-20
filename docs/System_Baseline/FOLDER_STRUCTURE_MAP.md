# 📁 FOLDER STRUCTURE MAP — RMS (Beyon-desk)

> **Phase 1 · Sub-Deliverable 1.2 — Folder & Code Structure Mapping**
> Generated: 2026-02-19 · Status: ✅ Complete

---

## 🌳 Project Root — `/Beyon-desk`

```
Beyon-desk/
│
├── /beyon79                → 🏠 Main Next.js application (all frontend + business logic lives here)
├── /electron               → 🖥️ Electron desktop wrapper (main process, preload, installer)
├── /android                → 📱 Capacitor-generated Android project (Gradle build, keystores)
├── /scripts                → 🔧 Build-time helper scripts (icon generation, dev port config)
├── /tests                  → 🧪 Playwright E2E test specs (KOT flow, example spec)
├── /dist                   → 📦 Build output (gitignored, generated artifacts)
├── /playwright-report      → 📊 Playwright HTML test reports (auto-generated)
├── /test-results           → 📊 Playwright test result artifacts (auto-generated)
├── /.github/workflows      → ⚙️ CI/CD: Playwright test runner + Windows build pipeline
├── /.vscode                → ⚙️ Editor settings
├── /.electron-temp         → ⚙️ Electron dev temp files
├── /.electron-user-data    → ⚙️ Electron user data during dev
│
├── package.json            → Root package (Electron + Capacitor deps, build scripts)
├── capacitor.config.json   → Capacitor mobile config
├── playwright.config.js    → E2E test configuration
├── build.bat / build.ps1   → Desktop build entry points
├── build-installer.ps1     → NSIS installer builder
├── install.ps1             → Full setup/install script
│
├── *.md                    → Documentation files (bug reports, module docs, TODO, packaging guide)
└── *.txt / *.log           → Debug logs and notes
```

---

## 🏠 Main Application — `/beyon79`

```
beyon79/
│
├── /pages                  → 📄 Next.js page routes — ALL pages including admin, KOT, cart, billing
│   ├── _app.js             → App wrapper (global providers, layout)
│   ├── _document.js        → HTML document customization
│   ├── index.js            → Home/landing page
│   ├── admin-unified.js    → ⚠️ GOD PAGE: 22 KB unified admin dashboard (orders, products, KOT tabs)
│   ├── admin-login.js      → Admin authentication page
│   ├── admin-offers.js     → ⚠️ LARGE: 35 KB offers management page
│   ├── admin-offers-current.js → Active offers view
│   ├── admin-offers-history.js → Historical offers view
│   ├── bill.js             → ⚠️ GOD PAGE: 50 KB billing/checkout page (mixed concerns)
│   ├── cart.js              → Shopping cart page
│   ├── kot-dashboard.js    → 16 KB kitchen order ticket dashboard
│   ├── manual-orders.js    → Manual order listing
│   ├── manual-order-complete.js → ⚠️ GOD PAGE: 50 KB manual order creation (full workflow in one file)
│   ├── order-confirmation.js → Order confirmation display
│   ├── order-status.js     → Order status tracking
│   ├── check-order-status.js → Order status checker
│   ├── print-receipt.js    → Thermal receipt printing
│   ├── update-details.js   → User details update
│   ├── maintenance.js      → Maintenance mode page
│   ├── /item               → Dynamic item detail route
│   │   └── [slug].js       → Product detail page (6 KB)
│   ├── /api                → Next.js API routes
│   │   └── local-orders.js → Local orders REST endpoint
│   ├── /pages              → 🔴 LEGACY DUPLICATE: Nested pages directory (see Risk section)
│   │   ├── admin-unified.js    → ⚠️ 92 KB DIVERGED copy of admin dashboard
│   │   ├── manual-order-complete.js → ⚠️ 67 KB DIVERGED copy
│   │   └── ... (17 more files — parallel copies of outer pages)
│   │
│   ├── admin-unified-backup.js → 🔴 LEGACY: 89 KB old backup
│   ├── admin-unified.txt   → 🔴 LEGACY: 107 KB text dump
│   └── test-*.js           → Test/debug pages (offer tests, KOT detail test, progress bar test)
│
├── /components             → 🧩 React UI components (feature-organized)
│   ├── /admin              → Admin panel components
│   │   ├── /tabs           → Tab content panels
│   │   │   ├── OrdersTab.jsx    → Orders management tab (11 KB)
│   │   │   ├── ProductsTab.jsx  → Products management tab (3.5 KB)
│   │   │   ├── KOTTab.jsx       → KOT management tab (9 KB)
│   │   │   ├── KOTTab-old.jsx   → 🔴 LEGACY old KOT tab
│   │   │   └── KOTTab-corrupted.jsx → 🔴 CORRUPTED file (40 KB)
│   │   ├── /layout         → Admin layout scaffolding
│   │   │   ├── AdminHeader.jsx  → Header with nav/branding
│   │   │   └── AdminLayout.jsx  → Page layout wrapper
│   │   ├── /products       → Product management UI
│   │   │   ├── ProductCard.jsx  → Product card display (9 KB)
│   │   │   └── ProductToolbar.jsx → Product action toolbar
│   │   ├── OrderRow.jsx    → ⚠️ LARGE: 16 KB order row component (likely has business logic in view)
│   │   ├── ProductEditModal.jsx → Product edit form
│   │   ├── OffersPanel.jsx → Offers summary panel
│   │   └── Toast.jsx       → Toast notifications
│   ├── /kot                → Kitchen Order Ticket components
│   │   ├── KOTDashboard.jsx → 16 KB main KOT dashboard
│   │   ├── KOTDetail.jsx   → ⚠️ LARGE: 24 KB order detail view (likely mixed concerns)
│   │   ├── KOTOrders.jsx   → 14 KB order list
│   │   ├── KOTQueue.jsx    → 14 KB order queue
│   │   ├── KOTStation.jsx  → 12 KB station view
│   │   └── KOTProgressBar.jsx → Progress indicator
│   ├── /manual-order       → Manual order flow components
│   │   ├── ItemsGrid.js    → Menu item grid selector
│   │   ├── CartSheet.js    → Cart sidebar sheet
│   │   ├── BillModal.js    → Bill summary modal
│   │   └── OfferBadge.js   → Offer indicator badge
│   ├── CartScreen.jsx      → Cart page component
│   ├── Receipt.js          → Receipt formatting
│   ├── AddToCartIcon.js    → Add-to-cart button
│   ├── ConfirmModal.js     → Generic confirmation modal
│   ├── ErrorBoundary.js    → React error boundary
│   ├── ImageWithLoader.js  → Lazy image loader
│   └── TestOffer.js        → Offer testing component
│
├── /hooks                  → 🪝 Custom React hooks (business logic extraction)
│   ├── /admin              → Admin-specific hooks
│   │   ├── useAdminState.js         → 7 KB admin state management
│   │   ├── useAdminOrders.js        → 9.5 KB order operations
│   │   ├── useAdminKeyboardShortcuts.js → 9 KB keyboard shortcut bindings
│   │   ├── useAdminProducts.js      → 3 KB product operations
│   │   ├── useAdminProductsEnhanced.js → 8 KB enhanced product ops
│   │   └── useAdminEffects.js       → 4 KB admin side effects
│   ├── useBillCalculation.js    → Bill total/tax computation
│   ├── useCartManagement.js     → 8.5 KB cart state operations
│   ├── useFilteredOrders.js     → 9 KB order filtering/search logic
│   ├── useUnifiedOrderData.js   → 8.5 KB unified order data accessor
│   └── useSearchAndCategory.js  → Category/search filter state
│
├── /src                    → 🔧 Core services & infrastructure (⚠️ Mixed: Node.js + Browser code)
│   ├── database.js         → MongoDB/Mongoose connection manager (Node.js — Electron only)
│   ├── databaseInit.js     → DB initialization & seeding (Node.js — Electron only)
│   ├── schemas.js          → Mongoose schema definitions (Node.js — Electron only)
│   ├── localDataService.js → ⚠️ GOD SERVICE: 14 KB — LocalForage CRUD for menu, orders, shop, offers (Browser)
│   ├── shortcutHandler.js  → 14 KB global keyboard shortcut dispatcher
│   ├── StorageMonitor.js   → Browser storage usage monitor
│   ├── ErrorBoundary.js    → ⚠️ DUPLICATE: Also exists in /components (different implementation)
│   ├── StorageMonitor.js.old       → 🔴 LEGACY backup
│   ├── StorageMonitor_clean.js     → 🔴 LEGACY clean version
│   ├── localDataService.js.backup  → 🔴 LEGACY backup
│   ├── localDataService.js.old     → 🔴 LEGACY old version (11 KB)
│   ├── localDataService_clean.js   → 🔴 LEGACY clean version (12 KB)
│   └── /hooks/admin
│       └── useAdminOffers.js → ⚠️ MISPLACED: Hook inside src/ (should be in /hooks)
│
├── /utils                  → 🛠️ Shared utility functions (pure helpers, no side effects)
│   ├── api.js              → API base URL and fetch wrapper
│   ├── slug.js             → URL slug generation
│   ├── imageMap.js         → Product name → image path mapping
│   ├── imageOverrides.js   → Image override rules
│   ├── offersEngine.js     → ⚠️ BUSINESS LOGIC: 4 KB offer calculation engine (not just a "util")
│   ├── manualOrderHelpers.js → ⚠️ BUSINESS LOGIC: 4 KB manual order processing helpers
│   └── tabFiltrationLogic.js → ⚠️ BUSINESS LOGIC: 7 KB tab filtering rules for admin
│
├── /data                   → 💾 Static/seed data and local data stores
│   ├── menuData.json       → Menu item seed data
│   ├── offers.json         → Offer rules seed data
│   ├── offers-history.json → Historical offers data
│   ├── shop-status.json    → Shop open/closed flag
│   ├── local-orders.json   → Sample order data
│   ├── local-orders-backup.json    → Order backup
│   ├── local-orders-updated.json   → Updated order snapshot
│   └── ordersStore-unified.js      → ⚠️ MIXED: JS module in JSON data folder (order store logic)
│
├── /models                 → 📐 Data model definitions
│   ├── Order.js            → Order schema/structure definition
│   └── kotModel.js         → 6 KB KOT data model with business logic
│
├── /lib                    → 📚 Library integrations and data normalization
│   ├── data-normalizer.js  → 6 KB API response normalization/transformation
│   └── react-query.js      → React Query client configuration
│
├── /contexts               → 🌐 React Context providers (global state)
│   └── OrderDataContext.js → Order state context (useReducer-based, 4 KB)
│
├── /helpers                → 🤝 Domain-specific helper functions
│   ├── adminFormatters.js  → Admin UI value formatters (dates, currency, status)
│   └── normalizeOrder.js   → Order data shape normalization
│
├── /styles                 → 🎨 Global CSS
│   └── globals.css         → ⚠️ LARGE: 21 KB single CSS file (entire app styling)
│
├── /public                 → 📁 Static assets served directly
│   ├── /food               → Food category SVG icons (burger, fries, sandwich)
│   ├── /images/menu        → Menu item photography
│   ├── /icons              → App icons
│   ├── favicon.ico         → Browser favicon
│   └── *.svg               → Framework default SVGs
│
├── /scripts                → 🐔 Domain-specific operational scripts
│   ├── check_chicken_status.js  → [?] Check chicken item availability
│   ├── tag_chicken_items.js     → [?] Tag items as chicken category
│   └── turn_off_all_chicken.js  → [?] Bulk disable chicken items
│
├── /__tests__              → 🧪 Jest unit tests
│   ├── useFilteredOrders.test.js → Hook filtering logic tests
│   └── KOTTab.test.js      → KOT tab component tests
│
├── /out                    → Next.js static export output (generated)
├── /.next                  → Next.js build cache (generated)
│
├── package.json            → App dependencies (Next.js, React, localforage, etc.)
├── next.config.js          → Next.js configuration
├── jest.config.js          → Jest test configuration
├── eslint.config.mjs       → ESLint rules
├── postcss.config.mjs      → PostCSS configuration
│
└── *.js                    → 🔴 LOOSE SCRIPTS: 10+ diagnostic/fix scripts at root level
                              (fix-implementation-plan.js, fix-kot-completion.js,
                               root-cause-analysis.js, systematic-diagnostic.js, etc.)
```

---

## 🖥️ Electron Shell — `/electron`

```
electron/
├── main.js              → ⚠️ GOD FILE: 42 KB — Window mgmt, IPC, printing, auto-update, tray, ALL in one
├── preload.js           → IPC bridge between main process and renderer (2.6 KB)
├── installer.nsh        → NSIS installer custom script (2.7 KB)
├── package.json         → Electron-specific dependencies
├── shortcuts.txt        → Keyboard shortcut documentation
├── /assets              → App icons for packaging
├── /dist                → Electron packaged builds (generated)
└── /node_modules        → Electron-specific node modules
```

---

## 📱 Android — `/android`

```
android/
├── /app                 → Android app module (Capacitor-generated, standard Gradle structure)
├── build.gradle         → Root Gradle config
├── capacitor.settings.gradle → Capacitor plugin settings
├── beyon-admin-keystore.jks → ⚠️ SENSITIVE: Signing keystore (should be in secrets)
├── keystore.properties  → ⚠️ SENSITIVE: Keystore credentials
└── /capacitor-cordova-android-plugins → Capacitor plugin bridge
```

---

## ⚠️ Risk Assessment

### 🔴 God Files (Unusually Large / Mixed Responsibilities)

| File | Size | Risk |
|---|---|---|
| `pages/admin-unified.js` | 22 KB | Multi-tab dashboard with orders, products, KOT in one page |
| `pages/bill.js` | 50 KB | Billing + checkout + receipt logic in one view |
| `pages/manual-order-complete.js` | 50 KB | Entire manual order workflow in one file |
| `pages/admin-offers.js` | 35 KB | Full offers CRUD in one page |
| `src/localDataService.js` | 14 KB | Single service handling ALL local data (menu, orders, shop, offers) |
| `electron/main.js` | 42 KB | All Electron concerns (windows, IPC, printing, updates) in one file |
| `styles/globals.css` | 21 KB | Entire app CSS in one stylesheet |

### 🔴 Legacy / Dead Code

| Item | Location | Issue |
|---|---|---|
| Nested `pages/pages/` | `beyon79/pages/pages/` | Full duplicate of outer pages with **diverged** file sizes |
| `admin-unified-backup.js` | `pages/` | 89 KB old backup sitting in production code |
| `admin-unified.txt` | `pages/` | 107 KB text dump in source tree |
| `*.old` / `*.backup` files | `src/` | 3 legacy file copies not cleaned up |
| `KOTTab-corrupted.jsx` | `components/admin/tabs/` | Corrupted 40 KB file still in tree |
| Loose diagnostic scripts | `beyon79/` root | 10+ one-off fix/debug scripts polluting app root |

### 🟡 Structural Concerns

| Concern | Details |
|---|---|
| **Misplaced hook** | `src/hooks/admin/useAdminOffers.js` lives in `/src` instead of `/hooks` |
| **Duplicate ErrorBoundary** | Two different implementations: `src/ErrorBoundary.js` vs `components/ErrorBoundary.js` |
| **Business logic in /utils** | `offersEngine.js`, `manualOrderHelpers.js`, `tabFiltrationLogic.js` contain domain logic, not pure utilities |
| **JS file in /data folder** | `ordersStore-unified.js` is a logic module living among JSON data files |
| **Mixed runtime in /src** | `database.js` + `schemas.js` are Node.js-only (Electron), while `localDataService.js` is browser-only |
| **Keystore in source** | `android/beyon-admin-keystore.jks` and credentials checked into repo |

### 🟢 Well-Structured Areas

| Area | Why |
|---|---|
| `/components` folder structure | Clean feature-based grouping (admin, kot, manual-order) |
| `/hooks` organization | Clear separation of admin hooks vs shared hooks |
| `/models` | Small, focused model files |
| `/contexts` | Single-responsibility context provider |
| `/helpers` | Focused, small utility files |
