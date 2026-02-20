# Phase 1 Architecture Diagrams

> **Generated:** 2026-02-20
> **Based on:** [System Module List](./SYSTEM_MODULE_LIST.md) and [Entry Flow](./ENTRY_FLOW.md)

---

## 1. System Context Map

This diagram visualizes the high-level architecture of the RMS, showing the relationship between the Electron Shell, the Next.js Frontend, and the various business modules and data services.

```mermaid
graph TD
    subgraph "RMS System (Beyon-desk)"
        Electron[🖥️ Electron Shell]
        NextApp[⚛️ Next.js Application]
        
        Electron -->|Wraps| NextApp
        
        subgraph "Core Business Modules"
            Admin[🏪 Admin Panel]
            KOT[🍳 KOT System]
            POS[🛒 Cart & Billing]
            Manual[📝 Manual Orders]
            Offers[🎁 Offers & Promotions]
            Orders[📦 Order Management]
            Menu[🍔 Product / Menu]
        end
        
        subgraph "Infrastructure & Services"
            Auth[🔐 Auth (Basic)]
            DataSvc[📡 Data Services]
            Storage[🗃️ Database & Storage]
            Utils[🛠️ Utilities]
            Shortcuts[⌨️ Keyboard Shortcuts]
        end
        
        NextApp --> Admin
        NextApp --> KOT
        NextApp --> POS
        NextApp --> Manual
        
        Admin --> Offers
        Admin --> Menu
        Admin --> Orders
        
        POS --> Orders
        Manual --> Orders
        KOT --> Orders
        
        Admin -.-> Auth
        
        Admin --> Shortcuts
        POS --> Shortcuts
        
        Orders --> DataSvc
        Menu --> DataSvc
        Offers --> DataSvc
        
        DataSvc --> Storage
    end
    
    style Electron fill:#f9f,stroke:#333,stroke-width:2px
    style NextApp fill:#61dafb,stroke:#333,stroke-width:2px,color:black
    style Storage fill:#f5ea92,stroke:#333,stroke-width:2px
```

---

## 2. Entry Flow & Request Lifecycle

This diagram traces how the application boots up across different platform (Desktop, Mobile, Web) and how data requests are handled, primarily highlighting the client-side nature of the architecture.

```mermaid
sequenceDiagram
    participant User
    participant Desktop as 🖥️ Desktop (Electron)
    participant Mobile as 📱 Mobile (Capacitor)
    participant Web as 🌐 Web (Next.js Dev)
    participant React as ⚛️ React App (_app.js)
    participant Router as 🔀 Next.js Router
    participant UI as 🖼️ Page/Component
    participant Hook as 🪝 Data Hook
    participant Svc as 📡 Data Service
    participant DB as 💾 LocalForage (IndexedDB)
    participant API as ⚡ API Route (/api)
    participant FS as 📂 File System (JSON)

    Note over Desktop, Web: ⚠️ APPLICATION BOOT FLOW

    par Desktop Boot
        Desktop->>Desktop: app.whenReady()
        Desktop->>Desktop: createWindow()
        Desktop->>React: Load Static Export (out/admin-unified.html)
    and Mobile Boot
        Mobile->>Mobile: WebView Init
        Mobile->>React: Load Static Export (out/index.html)
    and Web Boot
        Web->>Web: next dev (port 3000)
        Web->>React: Load _document.js / _app.js
    end

    React->>React: Init ErrorBoundary
    React->>React: Init ShortcutHandler
    
    React->>Router: Initial Route
    Router->>UI: Redirect to /admin-unified
    
    Note over User, FS: 🔄 DATA REQUEST FLOW (Primary)
    
    User->>UI: View Orders
    UI->>Hook: useAdminOrders()
    Hook->>Svc: localDataService.getOrders()
    Svc->>DB: getItem('orders')
    DB-->>Svc: Return Data (Client-Side)
    Svc-->>Hook: Return Orders
    Hook-->>UI: Update State
    
    Note over User, FS: ⚡ API REQUEST FLOW (Secondary/Legacy)
    
    User->>UI: Fetch Local Orders (via API)
    UI->>API: GET /api/local-orders
    API->>FS: fs.readFile(local-orders.json)
    FS-->>API: JSON Content
    API-->>UI: Response 200 OK
```
