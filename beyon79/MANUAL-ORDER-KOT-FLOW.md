# Manual Order to KOT Flow with 24-Hour Filtering Logic

## 🔄 Complete Flow Diagram

```
[Manual Order Cart] 
        ↓ (Order Created)
[Local Storage] ← createdAt timestamp added
        ↓ (KOT Tab loads)
[KOTTab.jsx] useEffect triggers
        ↓
[convertOrdersToKOT()] function
        ↓
┌─────────────────────────────────────────────────────────┐
│  FILTERING LAYER 1: Processed Orders Check              │
│  - Filter out orders already in processedOrderIds Set   │
│  - Prevents duplicate processing                         │
└─────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────┐
│  FILTERING LAYER 2: 24-Hour Time Filter                │
│  - KOTHelpers.isKOTRecent(order, 24)                   │
│  - Only orders ≤ 24 hours old pass through             │
│  - Old orders logged and discarded                     │
└─────────────────────────────────────────────────────────┘
        ↓
[Convert to KOT format] ← Only recent orders reach here
        ↓
[setKOTData()] ← Store in React state
        ↓
┌─────────────────────────────────────────────────────────┐
│  FILTERING LAYER 3: View-Level Filtering                │
│  - filterRecentKOTs() applied to each KOT view          │
│  - Dashboard, Queue, Stations all get filtered data    │
└─────────────────────────────────────────────────────────┘
        ↓
[KOT Components Display] ← Only recent orders shown
```

## 📍 Where Filtering Happens

### **1. During Order Conversion (Entry Point)**
**Location**: `KOTTab.jsx` → `convertOrdersToKOT()` → Lines 150-157

```javascript
// Filter orders to only include those within the last 24 hours
const recentOrders = newOrders.filter(order => {
  const isRecent = KOTHelpers.isKOTRecent({ createdAt: order.createdAt }, 24);
  if (!isRecent) {
    console.log('🕐 Filtering out old order:', order._id, 'created at:', order.createdAt);
  }
  return isRecent;
});
```

**What happens**:
- Manual orders from local storage are filtered BEFORE becoming KOTs
- Only orders ≤ 24 hours old are converted to KOT format
- Old orders are logged and discarded at this stage

### **2. During View Rendering (Display Layer)**
**Location**: `KOTTab.jsx` → `renderContent()` → Lines 599, 614, 627

```javascript
case 'dashboard':
  return (
    <KOTDashboard
      kotData={filterRecentKOTs(kotData)}  // ← Filtered here
      onKOTSelect={handleKOTSelect}
      onClearKOT={clearKOTData}
      onReloadKOT={reloadKOTData}
    />
  );

case 'queue':
  return (
    <KOTQueue
      kotData={filterRecentKOTs(kotData)}  // ← Filtered here
      onKOTSelect={handleKOTSelect}
      onStatusUpdate={handleStatusUpdate}
    />
  );
```

**What happens**:
- Each KOT view (Dashboard, Queue, Stations) receives filtered data
- Even if somehow old KOTs exist in state, they won't be displayed
- Double-protection ensures UI only shows recent orders

### **3. During Automatic Cleanup (Maintenance)**
**Location**: `KOTTab.jsx` → `useEffect()` → Lines 537-553

```javascript
// Cleanup old KOTs every 5 minutes
useEffect(() => {
  if (!isInitialized || kotData.length === 0) return;
  
  const cleanupInterval = setInterval(() => {
    cleanupOldKOTs();
  }, 5 * 60 * 1000); // 5 minutes
  
  return () => clearInterval(cleanupInterval);
}, [isInitialized, kotData.length]);
```

**What happens**:
- Every 5 minutes, old KOTs are removed from React state
- Prevents memory buildup from accumulated old orders
- Shows notification to user when cleanup occurs

## 🎯 Manual Order Journey

### **Step 1: Order Creation**
```javascript
// Manual Order Cart creates order
const newOrder = {
  items: [...],
  total: 520,
  createdAt: "2025-01-27T16:07:30.228Z", // ← Timestamp added
  source: "local",
  _id: "unique-order-id"
};
```

### **Step 2: Local Storage**
- Order saved to `local-orders.json`
- `createdAt` timestamp preserved
- Order waits for KOT processing

### **Step 3: KOT Tab Load**
```javascript
// useEffect triggers when KOT tab loads
useEffect(() => {
  const shouldConvert = localOrders && localOrders.length > 0 && 
                      kotData.length === 0 && isInitialized;
  if (shouldConvert) {
    convertOrdersToKOT(); // ← Filtering happens here
  }
}, [localOrders, kotData, isInitialized]);
```

### **Step 4: Filtering Logic**
```javascript
// Layer 1: Already processed?
const newOrders = localOrders.filter(order => 
  !processedOrderIds.has(order._id)
);

// Layer 2: Within 24 hours?
const recentOrders = newOrders.filter(order => {
  const orderDate = new Date(order.createdAt);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return orderDate >= twentyFourHoursAgo;
});
```

### **Step 5: KOT Conversion**
```javascript
// Only recent orders reach this point
const newKOTData = recentOrders.map(order => ({
  id: KOTHelpers.generateKOTId(),
  orderId: order._id,
  createdAt: order.createdAt, // ← Timestamp preserved
  status: mapOrderStatusToKOT(order.status),
  // ... other KOT fields
}));
```

### **Step 6: Display Filtering**
```javascript
// Each KOT view gets filtered data
const filteredData = filterRecentKOTs(kotData);
// = KOTHelpers.filterKOTsByTime(kotData, 24)
```

## 🔍 Key Filtering Points

### **Entry Point Filtering (Most Important)**
- **Where**: `convertOrdersToKOT()` function
- **When**: Before orders become KOTs
- **Impact**: Prevents old orders from entering KOT system

### **Display Layer Filtering (Safety Net)**
- **Where**: Each KOT component render
- **When**: Every time view renders
- **Impact**: Ensures UI never shows old orders

### **Maintenance Filtering (Cleanup)**
- **Where**: Periodic cleanup interval
- **When**: Every 5 minutes
- **Impact**: Removes old KOTs from memory

## 🎛️ Configuration Points

### **Change Time Window**
```javascript
// In convertOrdersToKOT()
const recentOrders = newOrders.filter(order => {
  const isRecent = KOTHelpers.isKOTRecent({ createdAt: order.createdAt }, 12); // 12 hours
  return isRecent;
});

// In filterRecentKOTs()
const filterRecentKOTs = (kotDataList) => {
  return KOTHelpers.filterKOTsByTime(kotDataList, 12); // 12 hours
};
```

### **Disable Filtering**
```javascript
// Comment out the filtering in convertOrdersToKOT()
// const recentOrders = newOrders.filter(order => { ... });
// Use newOrders directly instead
const recentOrders = newOrders;
```

## 📊 Real-World Example

### **Scenario**: You create 3 manual orders
1. **Order A**: Created 2 hours ago → ✅ Passes filter → Shows in KOT
2. **Order B**: Created 25 hours ago → ❌ Filtered out → Never shows in KOT
3. **Order C**: Created just now → ✅ Passes filter → Shows in KOT

### **Console Output**:
```
🔄 convertOrdersToKOT called with localOrders: 3 orders
🔍 New orders to process: 3 out of 3
🕐 Filtering out old order: order-b-id created at: 2025-01-26T15:00:00.000Z
🕐 Recent orders (within 24 hours): 2 out of 3
✅ Added 2 new KOTs, total KOTs now: 2
```

This ensures your KOT system only displays relevant, recent orders from your manual order cart!
