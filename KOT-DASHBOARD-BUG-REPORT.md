# KOT Dashboard Bug Report

## Issue Description
In the KOT tab dashboard, recent items in order items when items are marked as "ready" and "completed" are not reflecting in the dashboard's active orders list.

## Root Cause Analysis

### Bug Location
- **File**: `beyon79/components/kot/KOTDashboard.jsx`
- **Lines**: 20-23 and 203-271

### Problem Identified
The dashboard filters out completed and cancelled orders from the active display:

```javascript
setActiveKOTs(kotData.filter(kot => 
  kot.status !== KOT_STATUS.COMPLETED && 
  kot.status !== KOT_STATUS.CANCELLED
));
```

However, the statistics calculation (lines 27-67) correctly counts all orders including completed ones, but the **active orders display** (lines 203-271) only shows `activeKOTs`, which excludes completed orders.

### Data Flow Issue
1. **KOTTab.jsx** correctly updates order statuses when items are marked ready/completed
2. **KOTDashboard.jsx** correctly calculates statistics including completed orders
3. **Display Issue**: The `activeKOTs` state filters out completed orders, so they don't appear in the recent items list

## Impact
- Completed and ready orders disappear from the dashboard immediately upon status change
- Users cannot see recently completed orders in the active orders list
- Statistics show correct counts but visual display is inconsistent

## Technical Details

### Current Filtering Logic (Problematic)
```javascript
// Lines 20-23 in KOTDashboard.jsx
setActiveKOTs(kotData.filter(kot => 
  kot.status !== KOT_STATUS.COMPLETED && 
  kot.status !== KOT_STATUS.CANCELLED
));
```

### Statistics Calculation (Working Correctly)
```javascript
// Lines 27-67 in KOTDashboard.jsx
const calculateStats = () => {
  const stats = kotData.reduce((acc, kot) => {
    acc.totalOrders++;
    
    switch (kot.status) {
      case KOT_STATUS.READY:
        acc.readyOrders++;
        break;
      case KOT_STATUS.COMPLETED:
        acc.completedOrders++;
        break;
      // ... other statuses
    }
    return acc;
  }, { /* initial values */ });
  
  setStats(stats);
};
```

### Display Logic (Using Filtered Data)
```javascript
// Lines 203-271 in KOTDashboard.jsx
{activeKOTs.map((kot) => (
  // Order display component
))}
```

## Recommended Solution

### Option 1: Time-Based Filtering (Recommended)
Modify the filtering logic to include recently completed/ready orders within a time window (e.g., last 30 minutes) so they appear in the dashboard before being fully archived.

### Option 2: Separate Display States
Create separate display states for "Active Orders" and "Recent Completed Orders" to give users full visibility.

## Implementation Plan

1. **Modify filtering logic** to include recent completed/ready orders
2. **Add time-based filtering** function
3. **Update display logic** to handle mixed status orders
4. **Add visual indicators** for completed orders in the active list
5. **Test the fix** with various order status scenarios

## Files to Modify
- `beyon79/components/kot/KOTDashboard.jsx` - Main fix implementation

## Testing Scenarios
1. Mark order as "ready" - should remain visible in dashboard
2. Mark order as "completed" - should remain visible for specified time window
3. Mark order as "cancelled" - should be filtered out immediately
4. Time-based filtering - orders should disappear after time window expires

## Priority
**High** - This affects the core functionality of the KOT dashboard and user experience for kitchen staff.
