const fs = require('fs');

// Test with actual local orders data
const data = JSON.parse(fs.readFileSync('data/local-orders.json', 'utf8'));
console.log('📊 Total local orders:', data.length);

const now = Date.now();
const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

data.forEach((order, index) => {
  const orderTime = new Date(order.createdAt).getTime();
  const isRecent = orderTime >= twentyFourHoursAgo;
  const age = Math.floor((now - orderTime) / 1000 / 60 / 60); // hours
  
  console.log(`Order ${index + 1}: ${order._id} - ${age}h old - ${isRecent ? 'RECENT' : 'OLD'}`);
});

const recentCount = data.filter(order => 
  new Date(order.createdAt).getTime() >= twentyFourHoursAgo
).length;

console.log(`✅ Recent orders (within 24h): ${recentCount}/${data.length}`);

// Test the filtering function
const KOTHelpers = {
  isKOTRecent: (kot, hours = 24) => {
    if (!kot || !kot.createdAt) return false;
    const kotDate = new Date(kot.createdAt);
    const timeWindow = new Date(Date.now() - hours * 60 * 60 * 1000);
    return kotDate >= timeWindow;
  }
};

console.log('\n🧪 Testing with KOTHelpers function:');
data.forEach(order => {
  const isRecent = KOTHelpers.isKOTRecent(order, 24);
  console.log(`${order._id}: ${isRecent ? 'RECENT' : 'OLD'}`);
});
