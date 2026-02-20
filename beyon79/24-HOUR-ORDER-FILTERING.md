# 24-Hour Order Filtering Logic for KOT System

## Overview
This document explains the implementation of the 24-hour order filtering logic that ensures only recent orders (within the last 24 hours) are displayed in all KOT (Kitchen Order Ticket) tabs.

## Implementation Details

### 1. Core Filtering Logic

The filtering is implemented in the `KOTTab.jsx` component with helper functions in `kotModel.js`:

#### KOT Model Helper Functions (`models/kotModel.js`)
```javascript
// Check if KOT is within specified time window (in hours)
isKOTRecent: (kot, hours = 24) => {
  if (!kot || !kot.createdAt) return false;
  const kotDate = new Date(kot.createdAt);
  const timeWindow = new Date(Date.now() - hours * 60 * 60 * 1000);
  return kotDate >= timeWindow;
},

// Filter KOTs by time window
filterKOTsByTime: (kotData, hours = 24) => {
  if (!kotData || !Array.isArray(kotData)) return [];
  return kotData.filter(kot => KOTHelpers.isKOTRecent(kot, hours));
},

// Get KOT age in human-readable format
getKOTAge: (createdAt) => {
  // Returns "Just now", "2 hours ago", "1 day ago", etc.
}
```

#### KOT Tab Implementation (`components/admin/tabs/KOTTab.jsx`)
```javascript
// Helper function to filter KOT data to only include recent orders
const filterRecentKOTs = (kotDataList) => {
  return KOTHelpers.filterKOTsByTime(kotDataList, 24);
};
```

### 2. Where Filtering is Applied

The 24-hour filter is applied in multiple places:

#### A. During Order Conversion
When converting local orders to KOT format:
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

#### B. In All KOT Views
Every KOT view receives filtered data:
```javascript
case 'dashboard':
  return (
    <KOTDashboard
      kotData={filterRecentKOTs(kotData)}  // Filtered data
      onKOTSelect={handleKOTSelect}
      onClearKOT={clearKOTData}
      onReloadKOT={reloadKOTData}
    />
  );

case 'queue':
  return (
    <KOTQueue
      kotData={filterRecentKOTs(kotData)}  // Filtered data
      onKOTSelect={handleKOTSelect}
      onStatusUpdate={handleStatusUpdate}
    />
  );

case 'stations':
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {stations.map((station) => (
        <KOTStation
          key={station.id}
          station={station}
          kotData={filterRecentKOTs(kotData)}  // Filtered data
          onStationUpdate={handleStationUpdate}
        />
      ))}
    </div>
  );
```

### 3. Automatic Cleanup

The system includes automatic cleanup of old orders:

#### Periodic Cleanup
```javascript
// Cleanup old KOTs every 5 minutes
useEffect(() => {
  if (!isInitialized || kotData.length === 0) return;
  
  const cleanupInterval = setInterval(() => {
    cleanupOldKOTs();
  }, 5 * 60 * 1000); // 5 minutes
  
  // Run cleanup immediately on component mount after initialization
  const cleanupTimeout = setTimeout(() => {
    cleanupOldKOTs();
  }, 1000); // 1 second after initialization
  
  return () => {
    clearInterval(cleanupInterval);
    clearTimeout(cleanupTimeout);
  };
}, [isInitialized, kotData.length]);
```

#### Cleanup Function
```javascript
const cleanupOldKOTs = () => {
  console.log('🧹 Cleaning up old KOTs (older than 24 hours)');
  const currentKOTDataLength = kotData.length;
  const recentKOTs = filterRecentKOTs(kotData);
  
  if (recentKOTs.length < currentKOTDataLength) {
    console.log('🗑️ Removing', currentKOTDataLength - recentKOTs.length, 'old KOTs');
    setKOTData(recentKOTs);
    showToast(`Removed ${currentKOTDataLength - recentKOTs.length} old orders (older than 24 hours)`);
  }
};
```

## User Experience

### What Users See
- **Dashboard**: Only shows orders from the last 24 hours
- **Queue**: Filters out old orders automatically
- **Stations**: Each station only sees recent orders
- **Order Detail**: Shows individual order regardless of age (if accessed directly)

### Time Display
Orders show human-readable timestamps:
- "Just now" (less than 1 minute)
- "15 minutes ago" (less than 1 hour)
- "2h 30m ago" (less than 24 hours)
- "1d 2h ago" (more than 24 hours)

### Notifications
- When old orders are automatically cleaned up, users see a notification
- Console logging shows which orders are filtered out for debugging

## Manual Order Cart Flow

When you order something from the manual order cart:

1. **Order Creation**: Order is created with `createdAt` timestamp
2. **Local Storage**: Order is saved to local storage
3. **KOT Conversion**: System checks if order is within 24 hours
4. **Display**: If recent, order appears in all KOT tabs
5. **Aging**: Order ages and will be automatically removed after 24 hours

## Configuration

### Changing the Time Window
To change from 24 hours to a different time period:

1. Update the default parameter in `kotModel.js`:
```javascript
isKOTRecent: (kot, hours = 12) => { // Change 24 to 12 for 12 hours
```

2. Update the filter calls in `KOTTab.jsx`:
```javascript
const recentOrders = newOrders.filter(order => {
  const isRecent = KOTHelpers.isKOTRecent({ createdAt: order.createdAt }, 12);
  return isRecent;
});
```

### Disabling the Filter
To disable time-based filtering completely:

1. Set a very large time window:
```javascript
const recentOrders = newOrders.filter(order => {
  const isRecent = KOTHelpers.isKOTRecent({ createdAt: order.createdAt }, 24 * 365); // 1 year
  return isRecent;
});
```

2. Or remove the filtering logic entirely

## Testing

Run the test script to verify the filtering logic:
```javascript
// In browser console or Node.js
// Load test-24hour-filter.js and run the tests
```

## Benefits

1. **Performance**: Reduces data load by filtering old orders
2. **Relevance**: Shows only currently relevant orders
3. **Automatic**: No manual cleanup required
4. **Consistent**: Same filtering across all KOT views
5. **Flexible**: Easy to adjust time window or disable

## Troubleshooting

### Orders Not Showing
- Check console logs for "Filtering out old order" messages
- Verify order `createdAt` timestamps are valid ISO strings
- Check if orders are older than 24 hours

### Performance Issues
- If there are many orders, consider reducing the cleanup interval
- Ensure the filter is only applied when necessary

### Time Zone Issues
- All timestamps should be in UTC/ISO format
- Browser's local time zone is used for display only
