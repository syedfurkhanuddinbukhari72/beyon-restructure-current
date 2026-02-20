# Kitchen Order Ticket (KOT) Module Documentation

## Overview

The KOT module is a comprehensive kitchen order management system designed to streamline restaurant operations, improve order tracking, and enhance kitchen efficiency. It provides real-time order visibility, status tracking, and station management capabilities.

## Architecture

### Core Components

1. **Data Models** (`models/kotModel.js`)
   - KOT structure and status enums
   - Item status tracking
   - Kitchen station management
   - Helper functions for KOT operations

2. **React Components**
   - `KOTDashboard` - Overview with statistics and active orders
   - `KOTDetail` - Detailed order view with item management
   - `KOTQueue` - Order queue with filtering and bulk operations
   - `KOTStation` - Kitchen station monitoring and performance

3. **Pages**
   - `kot-dashboard.js` - Standalone KOT dashboard page
   - Integrated KOT tab in admin-unified.js

4. **API Integration**
   - `api/local-orders.js` - Backend API for order management

## Features

### 1. Order Management
- **Real-time Status Tracking**: Orders flow through stages: Pending → Confirmed → Preparing → Ready → Completed
- **Priority Levels**: Urgent, High, Normal, Low priority orders
- **Order Types**: Dine-in, Takeaway, Delivery support
- **Item-level Tracking**: Individual item status and preparation times

### 2. Kitchen Display System
- **Dashboard View**: Statistics overview with active orders count
- **Queue Management**: Filterable and sortable order queue
- **Station Monitoring**: Real-time station load and performance metrics
- **Bulk Operations**: Multi-select for batch status updates

### 3. Station Management
- **Predefined Stations**: Grill, Fryer, Cold Prep, Assembly
- **Load Balancing**: Visual indicators for station capacity
- **Performance Metrics**: Efficiency and throughput tracking
- **Category Assignment**: Automatic item categorization

### 4. Time Tracking
- **Estimated Times**: Automatic preparation time estimation
- **Actual Times**: Real-time cooking duration tracking
- **Elapsed Time Indicators**: Visual warnings for delayed orders
- **Performance Analytics**: Average preparation time calculations

## User Interface

### Navigation
- **Tab-based Navigation**: Dashboard, Queue, Stations, Detail views
- **Responsive Design**: Works on desktop and tablet devices
- **Real-time Updates**: Auto-refreshing data and timers

### Visual Indicators
- **Color-coded Status**: Yellow (Pending), Blue (Preparing), Green (Ready), Gray (Completed)
- **Priority Badges**: Red (Urgent), Orange (High), Blue (Normal), Gray (Low)
- **Progress Bars**: Visual completion percentage for orders
- **Load Indicators**: Station capacity utilization

## Integration Points

### 1. Order System Integration
- **Automatic Conversion**: Local orders converted to KOT format
- **Status Synchronization**: KOT status updates reflect in original orders
- **Bidirectional Updates**: Changes propagate across the system

### 2. Admin Panel Integration
- **Seamless Access**: KOT tab integrated into admin-unified.js
- **Shared State**: Leverages existing admin state management
- **Consistent UI**: Follows established design patterns

## Data Flow

```
Local Orders → KOT Conversion → Kitchen Display → Status Updates → Order Completion
     ↓              ↓                ↓              ↓              ↓
JSON Storage → KOT Model → React Components → API Updates → Status Sync
```

## Technical Implementation

### State Management
- **React Hooks**: useState, useEffect for component state
- **Real-time Updates**: Interval-based timer updates
- **Data Persistence**: JSON file storage for orders

### Performance Considerations
- **Lazy Loading**: Components load data on demand
- **Efficient Filtering**: Client-side search and filtering
- **Optimistic Updates**: Immediate UI feedback

### Error Handling
- **Graceful Degradation**: Fallback to empty states
- **User Feedback**: Toast notifications for actions
- **Data Validation**: Input sanitization and validation

## Usage Instructions

### 1. Accessing KOT System
- Navigate to admin panel (`/admin-unified`)
- Click on "KOT" tab
- Or access directly via `/kot-dashboard`

### 2. Managing Orders
- **View Dashboard**: Overview of all active orders
- **Process Queue**: Filter and update order statuses
- **Monitor Stations**: Check station performance and load
- **Detail View**: Manage individual order items

### 3. Station Operations
- **Monitor Load**: Visual indicators for station capacity
- **Track Performance**: Efficiency metrics and throughput
- **Assign Items**: Automatic category-based assignment

## Configuration

### Station Setup
Modify station definitions in `initializeStations()` function:
```javascript
{
  id: 'station-id',
  name: 'Station Name',
  description: 'Station description',
  categories: ['category1', 'category2'],
  capacity: 5,
  status: 'active'
}
```

### Item Categorization
Update `getItemCategory()` function for automatic item assignment:
```javascript
const getItemCategory = (itemName) => {
  // Custom categorization logic
  return 'category';
};
```

### Time Estimates
Modify `getEstimatedPrepTime()` for preparation time calculations:
```javascript
const getEstimatedPrepTime = (itemName) => {
  // Custom time estimation logic
  return 8; // minutes
};
```

## Future Enhancements

### Planned Features
1. **Kitchen Display Hardware**: Integration with kitchen display screens
2. **Printer Integration**: Automatic KOT printing capabilities
3. **Mobile App**: Kitchen staff mobile application
4. **Advanced Analytics**: Detailed performance reporting
5. **Multi-location Support**: Chain restaurant management

### Technical Improvements
1. **WebSocket Integration**: Real-time updates without polling
2. **Offline Support**: PWA capabilities for kitchen operations
3. **Voice Commands**: Hands-free order management
4. **AI Optimization**: Predictive preparation time suggestions

## Troubleshooting

### Common Issues
1. **Orders Not Loading**: Check API endpoint and file permissions
2. **Status Not Updating**: Verify state management and API calls
3. **Timer Not Working**: Check interval setup and time calculations
4. **Station Load Incorrect**: Verify capacity and assignment logic

### Debug Information
- Console logs for state changes
- Network tab for API calls
- React DevTools for component state
- Local storage for data persistence

## Support

For technical support or feature requests:
1. Check console for error messages
2. Verify data format in local-orders.json
3. Review component props and state
4. Test API endpoints independently

---

**Version**: 1.0.0  
**Last Updated**: January 2026  
**Compatibility**: Next.js 15.4.6, React 19.1.0
