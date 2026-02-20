# 2.3 'God File' Analysis & Dependency Graph

## 1. admin-unified.js Internal Structure

### Component Tree
*   **[Parent]** `AdminUnifiedPage`
    *   **[Provider]** `OrderDataProvider`
        *   **[Content]** `AdminUnifiedPageContent`
            *   **[Layout]** `AdminLayout`
                *   **[Tab]** `ProductsTab` (Rendered when `tab === "Products"`)
                    *   `ProductEditModal` (Implicit via state)
                *   **[Tab]** `OrdersTab` (Rendered when `tab !== "Products", "Offers", "KOT"`)
                *   **[Tab]** `KOTTab` (Rendered when `tab === "KOT"`)
                *   **[Tab]** `OffersPanel` (Rendered when `tab === "Offers"`)
                *   **[Utility]** `ConfirmModal`
                *   **[Toast]** Custom Toast UI (Rendered conditionally)

### State Clusters

*   **UI State:** `useAdminState`
    *   `tab`, `setTab` (Controls which major view is shown)
    *   `menuOpen`, `setMenuOpen` (Sidebar toggle)
    *   `toast`, `showToast` (Notifications)
    *   `confirmState` (Modal visibility)

*   **Order State:** `useUnifiedOrderData`
    *   `orders` (The massive list of all orders)
    *   `loading`, `error`
    *   `fetchOrders` (Function to reload data)

*   **Product State:** `useAdminProducts` + `useAdminState`
    *   `menu` (Full menu data)
    *   `productSearch` (Search query string)
    *   `productEditState` (Temporary state for editing a product)
    *   `productBusy` (Loading state for toggles)

*   **Offers State:** `useAdminOffers`
    *   `bundleRules` (Active promotions)
    *   `offersBusy` (Saving state)

### Prop Drilling Hotspots

*   **`filteredOrders`**: Passed from `AdminUnifiedPageContent` -> `OrdersTab` / `KOTTab`.
    *   *Risk:* Every filter change re-renders the big tabs.
*   **`handleUnifiedStatusUpdate`**: Passed from `AdminUnifiedPageContent` -> `OrdersTab` -> `OrderCard` (implied).
    *   *Risk:* A function recreated on every render (unless `useCallback` is perfect) causes pure children to re-render.
*   **`productSearch`**: Passed from `AdminUnifiedPageContent` -> `ProductsTab`.
    *   *Risk:* Typing in the search bar re-renders the *entire* admin page layout, not just the list.
*   **`shopStatus`**: Passed from `AdminUnifiedPageContent` -> `AdminLayout`.

---

## 2. electron/main.js IPC Handlers

| IPC Channel (Event Name) | Backend Triggers / Calls | Notes |
| :--- | :--- | :--- |
| `app-version` | `app.getVersion()` | Simple getter. |
| `show-save-dialog` | `dialog.showSaveDialog()` | Native OS dialog. |
| `print-receipt` | `printReceiptJob(order, options)` | **Complex Logic.** Handles native `webContents.print`, ESC/POS via USB, and network printing. |
| `list-printers` | `contents.getPrinters()` | Fetches system printers. |
| `test-escpos-connection` | `net.Socket.connect()` | Manually tests TCP connection to a printer IP. |
| `app-shortcut` (via `globalShortcut`) | `mainWindow.webContents.send('app-shortcut', ...)` | **Reverse IPC.** Main process captures keyboard (e.g., Shift+A) and sends to Renderer. |

### ⚠️ Hidden "God Mode" Logic
*   **Child Process Spawning:** Lines 220-330 contain logic to spawn a separate `node` process for `server.js` (Next.js Standalone). This is not an IPC handler but a lifecycle management responsibility.
*   **Printer Spooling:** The file contains 200+ lines of raw ESC/POS byte-code generation (`printWithEscPos`, `printWithTcpEscPos`) which should be in a service.

---

## 3. Refactoring Roadmap (Preview)

1.  **Extract `ProductState`**: Move all product-related state (search, edit, toggle) into a `ProductContext` or down into `ProductsTab`.
2.  **Extract `PrinterService`**: Move all `printReceiptJob` and ESC/POS logic to `electron/services/PrinterService.js`.
3.  **Extract `ShortcutManager`**: Move `globalShortcut` registration to `electron/managers/ShortcutManager.js`.
