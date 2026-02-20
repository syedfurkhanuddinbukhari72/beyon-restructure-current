const localforage = require('localforage');
localforage.config({
  name: 'restaurant_admin_offline',
  description: 'Restaurant Admin Offline Data Storage'
});

async function checkCurrentData() {
  try {
    const orders = await localforage.getItem('orders_v1');
    console.log('=== CURRENT LOCALFORAGE DATA ===');
    console.log('Total orders in storage:', orders ? orders.length : 0);
    
    if (orders && orders.length > 0) {
      const targetOrder = orders.find(o => o._id === 'KOT-1769618963804-ABC123DEF');
      console.log('\n=== TARGET ORDER SEARCH ===');
      console.log('KOT-1769618963804-ABC123DEF found:', !!targetOrder);
      
      if (targetOrder) {
        console.log('Order details:');
        console.log('  ID:', targetOrder._id);
        console.log('  Status:', targetOrder.status);
        console.log('  kotCompleted:', targetOrder.kotCompleted);
        console.log('  Source:', targetOrder.source);
        console.log('  Note:', targetOrder.note);
      }
      
      console.log('\n=== ALL ORDERS OVERVIEW ===');
      orders.forEach((order, i) => {
        const isReady = order.status === 'ready' || order.kotCompleted === true;
        console.log(`${i+1}. ${order._id} - Status: ${order.status}, kotCompleted: ${order.kotCompleted}, Ready: ${isReady}`);
      });
      
      const readyOrders = orders.filter(o => o.status === 'ready' || o.kotCompleted === true);
      console.log('\n=== READY ORDERS COUNT ===');
      console.log('Orders that should appear in Ready tab:', readyOrders.length);
      readyOrders.forEach(o => {
        console.log(`  - ${o._id} (status: ${o.status}, kotCompleted: ${o.kotCompleted})`);
      });
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

checkCurrentData();
