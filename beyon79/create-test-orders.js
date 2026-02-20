const fs = require('fs');

// Create test orders with recent timestamps
const testOrders = [
  {
    "items": [
      {
        "name": "Test Sandwich",
        "price": 120,
        "qty": 1
      }
    ],
    "note": "Test order - 2 hours ago",
    "status": "pending",
    "total": 120,
    "createdAt": new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    "source": "local",
    "_id": "test-order-2h",
    "updatedAt": new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    "items": [
      {
        "name": "Test Burger",
        "price": 150,
        "qty": 2
      }
    ],
    "note": "Test order - 30 minutes ago",
    "status": "pending",
    "total": 300,
    "createdAt": new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    "source": "local",
    "_id": "test-order-30m",
    "updatedAt": new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    "items": [
      {
        "name": "Test Wrap",
        "price": 140,
        "qty": 1
      }
    ],
    "note": "Test order - just now",
    "status": "pending",
    "total": 140,
    "createdAt": new Date().toISOString(), // Just now
    "source": "local",
    "_id": "test-order-now",
    "updatedAt": new Date().toISOString()
  },
  {
    "items": [
      {
        "name": "Old Test Order",
        "price": 100,
        "qty": 1
      }
    ],
    "note": "Test order - 25 hours ago (should be filtered out)",
    "status": "pending",
    "total": 100,
    "createdAt": new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
    "source": "local",
    "_id": "test-order-25h",
    "updatedAt": new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
  }
];

// Backup original orders
const originalOrders = JSON.parse(fs.readFileSync('data/local-orders.json', 'utf8'));
fs.writeFileSync('data/local-orders-backup.json', JSON.stringify(originalOrders, null, 2));

// Write test orders
fs.writeFileSync('data/local-orders.json', JSON.stringify(testOrders, null, 2));

console.log('✅ Created test orders in local-orders.json');
console.log('📁 Original orders backed up to local-orders-backup.json');
console.log('🧪 Test orders created:');
testOrders.forEach((order, index) => {
  const age = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 1000 / 60);
  console.log(`  ${index + 1}. ${order._id}: ${age} minutes ago - ${order.note}`);
});

// Test the filtering
const KOTHelpers = {
  isKOTRecent: (kot, hours = 24) => {
    if (!kot || !kot.createdAt) return false;
    const kotDate = new Date(kot.createdAt);
    const timeWindow = new Date(Date.now() - hours * 60 * 60 * 1000);
    return kotDate >= timeWindow;
  }
};

console.log('\n🧪 Filtering test:');
testOrders.forEach(order => {
  const isRecent = KOTHelpers.isKOTRecent(order, 24);
  console.log(`${order._id}: ${isRecent ? 'RECENT ✅' : 'OLD ❌'}`);
});

const recentCount = testOrders.filter(order => KOTHelpers.isKOTRecent(order, 24)).length;
console.log(`\n✅ Expected to show in KOT: ${recentCount}/${testOrders.length} orders`);
