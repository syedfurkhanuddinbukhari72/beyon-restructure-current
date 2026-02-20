# 🛠️ TECHNOLOGY STACK — RMS (Beyon-desk)

> **Phase 1 · Sub-Deliverable 1.3 — Technology Stack Documentation**
> Generated: 2026-02-19 · Status: ✅ Complete

---

## 📊 Stack Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT TARGETS                       │
│  🖥️ Windows Desktop (Electron + NSIS)                           │
│  📱 Android Mobile (Capacitor)                                  │
│  🌐 Web Browser (Next.js Dev Server)                            │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
┌────────▼────────┐  ┌───────▼────────┐  ┌────────▼────────┐
│ Electron 32     │  │ Capacitor 7    │  │ Next.js 15.4    │
│ (Main Process)  │  │ (Native Shell) │  │ (Dev Server)    │
│ Node.js Runtime │  │ WebView        │  │ Port 3000       │
└────────┬────────┘  └───────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
              ┌───────────────▼───────────────┐
              │     FRONTEND (React 19.1)     │
              │     Next.js 15.4 (Pages Router)│
              │     TailwindCSS v4            │
              └───────────────┬───────────────┘
                              │
              ┌───────────────▼───────────────┐
              │        DATA LAYER             │
              │  LocalForage (Browser/IndexedDB)│
              │  React Query v5 + SWR v2 ⚠️    │
              │  MongoDB + Mongoose v8 (Electron)│
              └───────────────────────────────┘
```

---

## 📋 Detailed Inventory

### 🎨 Frontend Framework

| Technology | Version | Purpose | Config File |
|---|---|---|---|
| **Next.js** | `15.4.6` | React framework (Pages Router, SSR-capable, used as static export for Electron) | `next.config.js` |
| **React** | `19.1.0` | UI rendering library | — |
| **React DOM** | `19.1.0` | DOM rendering | — |

> **Note:** Next.js is configured with `output: 'export'` (commented out for dev) to generate static HTML for Electron/Capacitor distribution. Webpack is customized to polyfill Node.js modules (`fs`, `net`, `tls`, `crypto`) for browser compatibility.

---

### 🎨 Styling

| Technology | Version | Purpose | Config File |
|---|---|---|---|
| **TailwindCSS** | `v4` | Utility-first CSS framework | `postcss.config.mjs` |
| **PostCSS** | via `@tailwindcss/postcss` | CSS processing pipeline | `postcss.config.mjs` |
| **globals.css** | — | ⚠️ 21 KB single monolithic CSS file | `styles/globals.css` |

---

### 🖥️ Desktop Shell

| Technology | Version | Purpose | Config File |
|---|---|---|---|
| **Electron** | `32.3.3` (root) / `^25.0.0` (electron/) | Desktop app wrapper (window mgmt, IPC, printing, auto-update, tray) | `electron/main.js` |
| **electron-builder** | `^25.0.0` (root) / `^24.0.0` (electron/) | Packaging & distribution | `package.json` build section |
| **NSIS** | via electron-builder | Windows installer generation | `electron/installer.nsh` |

> ⚠️ **Version Mismatch:** Electron is `32.3.3` in root but `^25.0.0` in `electron/package.json`. electron-builder is `^25` in root and `^24` in `electron/`. This means two different `package.json` files declare conflicting versions.

---

### 📱 Mobile Shell

| Technology | Version | Purpose | Config File |
|---|---|---|---|
| **Capacitor Core** | `^7.4.3` | Native bridge between web app and mobile | `capacitor.config.json` |
| **Capacitor Android** | `^7.4.3` | Android-specific native integration | — |
| **Capacitor CLI** | `^7.4.3` | Build/sync tooling | — |

> **Config:** App ID is `com.beyon.adminoffline`, serves static export from `beyon79/out` via `https` scheme.

---

### 💾 Data Storage & Fetching

| Technology | Version | Purpose | Used Where |
|---|---|---|---|
| **LocalForage** | `^1.10.0` | Browser-side persistent storage (IndexedDB/WebSQL/localStorage fallback) | `src/localDataService.js` |
| **MongoDB** | `^6.0.0` | Document database (local instance for Electron) | `src/database.js` |
| **Mongoose** | `^8.0.0` | MongoDB ODM with schema validation | `src/database.js`, `src/schemas.js` |
| **React Query** (TanStack) | `^5.90.20` | Server state management & caching | `lib/react-query.js` |
| **React Query DevTools** | `^5.91.3` | Dev-time query inspector | `beyon79/package.json` |
| **SWR** | `^2.4.0` | ⚠️ Stale-while-revalidate data fetching (DUPLICATE purpose with React Query) | Root `package.json` |

> ⚠️ **Dual Fetching Libraries:** Both `@tanstack/react-query` (v5) and `swr` (v2) are installed. They serve the same purpose. This is likely technical debt — only one should be used.

---

### 🧩 UI Libraries & Icons

| Technology | Version | Purpose |
|---|---|---|
| **Heroicons** | `^2.2.0` | SVG icon set (Tailwind ecosystem) |
| **Lucide React** | `^0.544.0` | Icon library |
| **React Icons** | `^5.5.0` | Multi-library icon package |

> ⚠️ **Three Icon Libraries:** Three different icon packages are installed. This adds bundle size and indicates inconsistent usage across the codebase.

---

### 📄 Document Generation

| Technology | Version | Purpose |
|---|---|---|
| **jsPDF** | `^2.5.2` | PDF generation (receipts, reports) |
| **html2canvas** | `^1.4.1` | HTML-to-image rendering (for PDF conversion) |

---

### 🧪 Testing

| Technology | Version | Purpose | Config File |
|---|---|---|---|
| **Jest** | `^30.2.0` | Unit testing framework | `beyon79/jest.config.js` |
| **Testing Library (React)** | `^16.3.2` | React component testing utilities | — |
| **Testing Library (jest-dom)** | `^6.9.1` | DOM assertion matchers | — |
| **Playwright** | `^1.58.2` | E2E browser testing | `playwright.config.js` |

> **Jest** runs with `jest-environment-jsdom` and `next/jest` integration.
> **Playwright** targets Chromium, Firefox, and WebKit; configured for parallel runs with HTML reporter.

---

### 🔧 Developer Tooling

| Technology | Version | Purpose |
|---|---|---|
| **ESLint** | `^9` | Code linting (with `eslint-config-next`) |
| **Prettier** | `^3.8.1` | Code formatting |
| **eslint-config-prettier** | `^10.1.8` | Disable ESLint rules that conflict with Prettier |
| **concurrently** | `^9.0.0` | Run multiple scripts simultaneously (Next.js + Electron) |
| **cross-env** | `^7.0.3` | Cross-platform environment variables |
| **wait-on** | `^8.0.0` | Wait for Next.js server before launching Electron |
| **kill-port** | `^2.0.1` | Kill processes on specific ports |

---

### 🖼️ Image Processing (Build-time)

| Technology | Version | Purpose |
|---|---|---|
| **Sharp** | `^0.34.4` | High-performance image processing |
| **Jimp** | `^1.6.0` | JavaScript image manipulation |
| **png-to-ico** | `^3.0.1` | PNG to ICO conversion (app icons) |
| **to-ico** | `^1.1.5` | Alternative ICO generator |

> ⚠️ **Duplicate image tools:** Both `sharp` and `jimp` serve similar purposes. Both `png-to-ico` and `to-ico` do the same thing.

---

### ⚙️ CI/CD

| Tool | File | Purpose |
|---|---|---|
| **GitHub Actions** | `.github/workflows/playwright.yml` | Run Playwright E2E tests on push/PR |
| **GitHub Actions** | `.github/workflows/windows-build.yml` | Windows desktop build pipeline |

---

## 🔐 Environment & Secrets

| Variable | Location | Value | Risk |
|---|---|---|---|
| `ADMIN_PASSWORD` | `beyon79/.env.local` | `admin123` | 🔴 **CRITICAL:** Hardcoded plaintext password in source |
| `NEXT_PUBLIC_API_URL` | `beyon79/.env.local` | Intentionally unset (same-origin) | ✅ OK |
| `MONGODB_URI` | `src/database.js` | Defaults to `mongodb://localhost:27017/beyon_admin` | 🟡 Local only |
| Android keystore | `android/beyon-admin-keystore.jks` | Binary keystore + `keystore.properties` | 🔴 **CRITICAL:** Signing credentials in source control |

---

## ⚠️ Stack Risks & Observations

| # | Risk | Severity | Detail |
|---|---|---|---|
| 1 | **Dual data fetching libs** | 🟡 Medium | Both React Query v5 and SWR v2 installed — redundant, increases bundle |
| 2 | **Three icon libraries** | 🟡 Medium | Heroicons + Lucide + React Icons all installed |
| 3 | **Electron version mismatch** | 🟡 Medium | Root declares `32.3.3`, electron/ declares `^25.0.0` |
| 4 | **electron-builder version mismatch** | 🟡 Medium | Root declares `^25`, electron/ declares `^24` |
| 5 | **Duplicate image processing** | 🟢 Low | Sharp + Jimp; png-to-ico + to-ico (dev-only) |
| 6 | **Hardcoded admin password** | 🔴 High | `admin123` in `.env.local` — not a real secret management strategy |
| 7 | **Keystore in repo** | 🔴 High | Android signing key committed to git |
| 8 | **Dual MongoDB layers** | 🟡 Medium | `database.js` (Mongoose/server) vs `localDataService.js` (LocalForage/browser) — very different runtimes sharing `/src` |
