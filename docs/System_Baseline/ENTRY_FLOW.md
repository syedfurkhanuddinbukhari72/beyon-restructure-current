# 🚀 ENTRY FLOW — RMS (Beyon-desk)

> **Phase 1 · Sub-Deliverable 1.4 — Entry Point Identification**
> Generated: 2026-02-19 · Status: ✅ Complete

---

## 📊 Boot Flow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        THREE DEPLOYMENT ENTRY POINTS                       │
└─────────────────────────────────────────────────────────────────────────────┘

  🖥️ DESKTOP (Electron)        📱 MOBILE (Capacitor)        🌐 WEB (Dev)
  ─────────────────────        ─────────────────────        ─────────────
  electron/main.js             capacitor.config.json        npm run dev
        │                            │                          │
  app.whenReady()              WebView loads                next dev
        │                      beyon79/out/                  (port 3000)
  createWindow()               index.html                       │
        │                            │                          │
  ┌─────▼──────────┐                 │                          │
  │ Dev? Probe      │                │                          │
  │ ports 3000-02   │                │                          │
  │ → loadURL()     │                │                          │
  ├─────────────────┤                │                          │
  │ Prod? Load      │                │                          │
  │ static export   │                │                          │
  │ out/admin-      │                │                          │
  │ unified.html    │                │                          │
  └─────┬──────────┘                 │                          │
        │                            │                          │
        └────────────────────────────┼──────────────────────────┘
                                     │
                          ┌──────────▼──────────┐
                          │  _document.js        │
                          │  • <base href="./">   │
                          │  • Global polyfill   │
                          │  • CSP headers       │
                          └──────────┬──────────┘
                                     │
                          ┌──────────▼──────────┐
                          │  _app.js             │
                          │  • globals.css       │
                          │  • ErrorBoundary     │
                          │  • shortcutHandler   │
                          │  • Message listener  │
                          └──────────┬──────────┘
                                     │
                          ┌──────────▼──────────┐
                          │  index.js            │
                          │  → redirect to       │
                          │  /admin-unified      │
                          └──────────┬──────────┘
                                     │
                          ┌──────────▼──────────┐
                          │  admin-unified.js    │
                          │  (Main Dashboard)    │
                          │  Orders│Products│KOT │
                          └──────────────────────┘
```

---

## 1️⃣ Desktop Entry (Electron)

### Startup File
**`electron/main.js`** (42 KB, 992 lines)

### Boot Sequence

```
1. app.whenReady()
   │
   ├── 2. disableDevTools()         → Block F12, Ctrl+Shift+I, etc.
   │
   ├── 3. createWindow()
   │      ├── Create BrowserWindow (1400×900, preload.js)
   │      ├── Set security: contextIsolation=true, sandbox=true (prod)
   │      │
   │      ├── IF dev mode:
   │      │   └── Probe ports 3000, 3001, 3002
   │      │       └── loadURL("http://localhost:{port}/admin-unified?tab=Active")
   │      │
   │      └── IF production:
   │          ├── Search for static export in candidate dirs:
   │          │   ├── {resourcesPath}/beyon79/out/
   │          │   ├── {appRoot}/beyon79/out/
   │          │   └── {__dirname}/../beyon79/out/
   │          ├── Prefer: admin-unified.html (flat) → admin-unified/index.html → index.html
   │          └── Fallback: Try Next.js standalone server (spawn server.js on free port)
   │
   ├── 4. Register Global Shortcuts (12 total)
   │      ├── Shift+A → switch_to_active_tab
   │      ├── Shift+R → switch_to_ready_tab
   │      ├── Shift+P → switch_to_paid_tab
   │      ├── Shift+H → switch_to_archive_tab
   │      ├── Shift+C → open_cart / cancel_order
   │      ├── Shift+L → local_mode
   │      ├── Shift+Enter → place_order
   │      ├── Shift+Backspace → go_back
   │      ├── m (double-press) → open_manual_order_complete
   │      ├── b (double-press) → open_bill
   │      └── p (double-press) → print_current
   │
   ├── 5. Register IPC Handlers
   │      ├── 'app-version'           → Return app version
   │      ├── 'show-save-dialog'      → Open native save dialog
   │      ├── 'print-receipt'         → Print via ESC/POS, TCP, or spooler
   │      ├── 'list-printers'         → List system printers
   │      └── 'test-escpos-connection'→ Test network printer connectivity
   │
   └── 6. Build Application Menu (File, Shortcuts, View)
```

### Preload Bridge (`electron/preload.js`)

```
Exposed as window.electronAPI:
  ├── getVersion()                → IPC: app-version
  ├── showSaveDialog(opts)        → IPC: show-save-dialog
  ├── printReceipt(order, opts)   → IPC: print-receipt
  ├── listPrinters()              → IPC: list-printers
  ├── testEscposConnection()      → IPC: test-escpos-connection
  └── platform                    → process.platform

IPC Listeners (forwarded to renderer via window.postMessage):
  ├── 'print-order'  → { type: 'print-order', order }
  └── 'app-shortcut' → { type: 'app-shortcut', payload }

Polyfills applied:
  ├── window.global = window
  ├── window.globalThis = window
  └── window.process.env.NODE_ENV
```

---

## 2️⃣ Web/Next.js Entry

### Boot Sequence

```
1. _document.js (HTML shell)
   ├── <base href="./"> for relative asset paths (needed for file:// in Electron)
   ├── Global polyfill: window.global = window
   └── Content Security Policy (strict in prod, relaxed in dev)

2. _app.js (React root)
   ├── Import globals.css (21 KB monolithic stylesheet)
   ├── Import src/ErrorBoundary (wraps entire app)
   ├── Import src/shortcutHandler (registers browser-side keyboard shortcuts)
   └── Window message listener:
       └── Listens for 'beyon:app-shortcut' messages from Electron preload
           └── Handles 'go_back' action (history.back or redirect to /)

3. index.js (home page — NOT a dashboard)
   └── Client-side redirect → router.replace('/admin-unified')

4. admin-unified.js (actual landing page)
   └── Unified admin dashboard with Orders, Products, KOT tabs
```

### Route Map (All Next.js File-Based Routes)

| URL Path | Page File | Purpose |
|---|---|---|
| `/` | `index.js` | Redirect → `/admin-unified` |
| `/admin-unified` | `admin-unified.js` | 🏠 **Main dashboard** (Orders, Products, KOT) |
| `/admin-login` | `admin-login.js` | Admin authentication |
| `/admin-offers` | `admin-offers.js` | Full offers management |
| `/admin-offers-current` | `admin-offers-current.js` | Active offers view |
| `/admin-offers-history` | `admin-offers-history.js` | Offer history |
| `/kot-dashboard` | `kot-dashboard.js` | Kitchen order ticket management |
| `/manual-orders` | `manual-orders.js` | Manual order listing |
| `/manual-order-complete` | `manual-order-complete.js` | Manual order creation form |
| `/cart` | `cart.js` | Shopping cart |
| `/bill` | `bill.js` | Billing / checkout |
| `/order-confirmation` | `order-confirmation.js` | Order confirmation |
| `/order-status` | `order-status.js` | Order status tracking |
| `/check-order-status` | `check-order-status.js` | Order status checker |
| `/print-receipt` | `print-receipt.js` | Receipt printing |
| `/item/[slug]` | `item/[slug].js` | Dynamic product detail page |
| `/update-details` | `update-details.js` | User details form |
| `/maintenance` | `maintenance.js` | Maintenance mode |
| `/api/local-orders` | `api/local-orders.js` | REST API: Local orders CRUD |

### API Route Detail

**`/api/local-orders`** — The ONLY server-side API route

```
GET    /api/local-orders           → Read orders from data/local-orders.json
POST   /api/local-orders           → Append new order to JSON file
PUT    /api/local-orders           → Update order by _id in JSON file
DELETE /api/local-orders?id={id}   → Remove order by _id from JSON file
```

> ⚠️ **No middleware chain exists.** No CORS, no auth middleware, no body parser config — Next.js API routes handle JSON parsing automatically. The API route reads/writes directly to a JSON file on disk.

---

## 3️⃣ Mobile Entry (Capacitor)

### Boot Sequence

```
1. capacitor.config.json
   ├── appId: "com.beyon.adminoffline"
   ├── appName: "Admin Offline"
   ├── webDir: "beyon79/out" (static export)
   └── server.androidScheme: "https"

2. Android WebView loads beyon79/out/index.html
   └── Same flow as Web entry from _document.js onward
```

> **Note:** Mobile uses the same static export as Electron production. No native Capacitor plugins are configured beyond the core bridge.

---

## 🔐 Authentication Flow

```
/admin-login → Checks password against ADMIN_PASSWORD env var ("admin123")
             → No token/session generated
             → No route guards or middleware protection
             → Other pages are unprotected — anyone with the URL can access them
```

> ⚠️ **No real auth system.** Authentication is a single password comparison in `admin-login.js`. No JWT, no session, no route protection middleware.

---

## 📡 Data Flow (Request Entry)

```
User Action in Browser
        │
        ├── LOCAL DATA PATH (Primary — 95% of operations)
        │   └── Component → Hook (useAdminOrders, etc.)
        │       └── localDataService.js → LocalForage (IndexedDB)
        │           └── Read/Write directly to browser storage
        │
        ├── API PATH (Minimal — only local-orders)
        │   └── fetch('/api/local-orders') → api/local-orders.js
        │       └── Read/Write to data/local-orders.json (file system)
        │
        └── ELECTRON IPC PATH (Desktop-only features)
            └── window.electronAPI.printReceipt(order)
                └── preload.js → ipcRenderer.invoke('print-receipt')
                    └── main.js → printReceiptJob()
                        ├── ESC/POS (USB/Network)
                        ├── TCP raw (port 9100)
                        └── OS print spooler (webContents.print)
```

---

## ⚠️ Entry Flow Observations

| # | Observation | Severity |
|---|---|---|
| 1 | **No middleware chain** — No CORS, auth guards, rate limiting, or logging middleware | 🟡 Noted |
| 2 | **No centralized router** — Next.js file-based routing; no explicit route registration | 🟢 By design |
| 3 | **No DB connection on startup** — App is 100% client-side; MongoDB code in `/src` is dead code in browser context | 🟡 Confusing |
| 4 | **No auth protection on routes** — All pages are publicly accessible without login | 🔴 Risk |
| 5 | **API writes directly to JSON file** — No validation, no schema checks, no race condition handling | 🟡 Fragile |
| 6 | **42 KB monolithic Electron main.js** — Boot, shortcuts, printing, IPC, menus all in one file | 🟡 God file |
| 7 | **Dual shortcut systems** — Electron global shortcuts + browser shortcutHandler.js with overlapping actions | 🟡 Redundancy |
