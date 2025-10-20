# TODO: Make App Fully Offline

## Phase 1: Core API Replacement
- [x] Update utils/api.js to use localDataService instead of fetch calls
- [ ] Test createOrder and getOrders functions work locally

## Phase 2: Page Component Updates
- [x] Update pages/order-status.js to use local data
- [x] Update pages/manual-orders.js to use local data
- [x] Update pages/manual-order-complete.js to use local data
- [x] Update pages/item/[slug].js to use local menu data
- [x] Update pages/cart.js to use local offers rules
- [x] Update pages/admin-offers.js to use local data
- [x] Update pages/admin-offers-history.js to use local data
- [x] Update pages/admin-offers-current.js to use local data
- [x] Update pages/admin-login.js to use local authentication

## Phase 3: API Route Removal
- [ ] Remove/disable pages/api/orders.js
- [ ] Remove/disable pages/api/orders/[id].js
- [ ] Remove/disable pages/api/orders/[id]/status.js
- [ ] Remove/disable all pages/api/admin/*.js files

## Phase 4: External Dependencies
- [x] Remove image placeholder APIs from utils/imageMap.js (keep WhatsApp links)
- [x] Update any backend URL references

## Phase 5: Testing
- [ ] Test all functionality works offline
- [ ] Verify localforage storage is working
- [ ] Test admin panel functionality
- [ ] Test order creation and management
