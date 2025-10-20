# Offers System Bug Fixes

## Current Issues
- Offers apply in cart but not visible in admin interface
- No offers management in admin panel
- Orders don't show applied offers or discounted totals
- No way to remove offers from existing orders
- Data flow issues between cart and admin

## Fix Plan

### Phase 1: Admin Interface Enhancements
- [ ] Add "Offers" tab to admin-unified.js
- [ ] Create offers management UI (view, create, edit, delete offers)
- [ ] Show applied offers in order details
- [ ] Display discounted totals in order rows

### Phase 2: Order Display Improvements
- [ ] Update OrderRow component to show offer indicators
- [ ] Add offer details in expanded order view
- [ ] Show original vs discounted prices
- [ ] Add offer removal functionality

### Phase 3: Data Flow Fixes
- [ ] Ensure offers are persisted with orders
- [ ] Update localDataService to track applied offers
- [ ] Fix cart.js to properly store offer information
- [ ] Add offer validation and error handling

### Phase 4: Testing & Validation
- [ ] Test offer application in cart
- [ ] Verify admin interface shows offers correctly
- [ ] Test offer removal functionality
- [ ] Validate data persistence across sessions

## Files to Modify
- `beyon79/pages/admin-unified.js` - Add offers tab and management
- `beyon79/pages/cart.js` - Improve offer tracking
- `beyon79/src/localDataService.js` - Add offer persistence
- `beyon79/utils/offersEngine.js` - Enhance offer logic
- `beyon79/components/OrderRow.js` - Show offer indicators

## Priority Order
1. Add offers tab to admin interface
2. Show applied offers in order display
3. Add offer management functionality
4. Improve data persistence
5. Add offer removal capabilities
