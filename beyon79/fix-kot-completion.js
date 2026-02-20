// Quick fix for KOT completion issue
// This fixes the scope problem with updatedKOT variable

const handleStatusUpdate = (kotId, newStatus) => {
  console.log('🔄 handleStatusUpdate called:', { kotId, newStatus });
  
  // Find the KOT first to get updatedKOT in the correct scope
  const currentKOT = kotData.find(k => k.id === kotId);
  if (!currentKOT) {
    console.error('❌ KOT not found:', kotId);
    return;
  }
  
  const updatedKOT = { ...currentKOT, status: newStatus };
  console.log('🔍 Updating KOT:', { id: currentKOT.id, oldStatus: currentKOT.status, newStatus, orderId: currentKOT.orderId });
  
  // Update KOT data
  setKOTData(prev => prev.map(kot => {
    if (kot.id === kotId) {
      if (newStatus === KOT_STATUS.PREPARING && !currentKOT.startedAt) {
        updatedKOT.startedAt = new Date().toISOString();
      } else if (newStatus === KOT_STATUS.COMPLETED && currentKOT.startedAt) {
        updatedKOT.completedAt = new Date().toISOString();
        updatedKOT.actualTime = Math.floor(
          (new Date(updatedKOT.completedAt) - new Date(currentKOT.startedAt)) / 1000 / 60
        );
      }
      return updatedKOT;
    }
    return kot;
  }));

  // Handle KOT completion - create/update local order
  if (newStatus === KOT_STATUS.COMPLETED) {
    console.log('🆕 KOT COMPLETED - Creating/Updating local order');
    
    // Find existing order
    let existingOrder = localOrders.find(order => order._id === currentKOT.orderId);
    if (!existingOrder && currentKOT) {
      existingOrder = localOrders.find(order => order.kotId === currentKOT.id);
    }
    
    if (existingOrder && onLocalOrderUpdate) {
      // Update existing order
      const updatedOrder = {
        ...existingOrder,
        status: 'ready',
        kotCompleted: true,
        kotId: currentKOT.id,
        updatedAt: new Date().toISOString()
      };
      
      console.log('📝 Updating existing order to Ready status:', updatedOrder._id);
      onLocalOrderUpdate(updatedOrder);
      showToast(`Order ${currentKOT.orderId} is now ready!`);
      
    } else if (currentKOT && onLocalOrderUpdate) {
      // Create new order
      const newOrder = {
        _id: currentKOT.orderId || currentKOT.id,
        status: 'ready',
        kotCompleted: true,
        kotId: currentKOT.id,
        items: currentKOT.items.map(item => ({
          name: item.name,
          price: item.unitPrice || item.price || 0,
          quantity: item.quantity || item.qty || 1
        })),
        total: currentKOT.totalAmount || currentKOT.total || 0,
        createdAt: currentKOT.createdAt || new Date().toISOString(),
        source: 'kot'
      };
      
      console.log('🆕 Creating new local order:', newOrder._id);
      onLocalOrderUpdate(newOrder);
      showToast(`KOT ${currentKOT.id} completed and moved to Ready tab!`);
    }
  }
};

console.log('🔧 KOT completion fix loaded');
