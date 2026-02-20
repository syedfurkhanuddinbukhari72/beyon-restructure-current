# Manual Testing Guide for 24-Hour KOT Filtering

## 🧪 Test Scenarios

### **Scenario 1: Create New Orders**
1. Go to Manual Order Cart
2. Create a new order
3. **Expected**: Order appears in all KOT tabs immediately
4. **Check**: Order shows "Just now" or "X minutes ago"

### **Scenario 2: Check Time Display**
1. Look at existing orders in KOT tabs
2. **Expected**: See human-readable timestamps:
   - "Just now" (less than 1 minute)
   - "15 minutes ago" (less than 1 hour)
   - "2h 30m ago" (less than 24 hours)
   - "1d 2h ago" (more than 24 hours - should be filtered out)

### **Scenario 3: Verify Filtering Works**
1. Check console logs for filtering messages
2. **Expected**: See logs like "🕐 Filtering out old order" for old orders
3. **Expected**: See "🕐 Recent orders (within 24 hours): X out of Y"

### **Scenario 4: Test Automatic Cleanup**
1. Wait 5 minutes after loading KOT tab
2. **Expected**: See notification if old orders were removed
3. **Expected**: Console shows "🧹 Cleaning up old KOTs"

### **Scenario 5: Test All KOT Views**
1. **Dashboard**: Should only show recent orders
2. **Queue**: Should only show recent orders  
3. **Stations**: Each station should only see recent orders
4. **Expected**: All views show same filtered data

## 🔍 Debugging Steps

### **Check Console Logs**
Open browser dev tools (F12) and look for:
- `🕐 Filtering out old order` - Shows which orders are filtered
- `🕐 Recent orders (within 24 hours)` - Shows filtering results
- `🧹 Cleaning up old KOTs` - Shows automatic cleanup

### **Verify Order Timestamps**
1. Check local storage for orders
2. Verify `createdAt` fields are valid ISO dates
3. Check if orders are actually older than 24 hours

### **Test with Different Time Windows**
Temporarily modify the filter to test:
```javascript
// In KOTTab.jsx, change 24 to 1 for 1-hour testing
const recentOrders = newOrders.filter(order => {
  const isRecent = KOTHelpers.isKOTRecent({ createdAt: order.createdAt }, 1); // 1 hour
  return isRecent;
});
```

## ⚠️ Common Issues

### **Orders Not Showing**
- Check if `createdAt` is a valid ISO string
- Verify orders aren't older than 24 hours
- Check console for filtering messages

### **All Orders Disappeared**
- Check if all orders are older than 24 hours
- Verify time zone settings
- Check if filter is working too aggressively

### **Performance Issues**
- If many orders, cleanup might take time
- Check if cleanup interval is appropriate

## ✅ Success Criteria

- ✅ New orders appear immediately in all KOT tabs
- ✅ Orders older than 24 hours are automatically filtered out
- ✅ Time displays are human-readable and accurate
- ✅ Console logs show filtering activity
- ✅ Automatic cleanup works every 5 minutes
- ✅ All KOT views show consistent filtered data
