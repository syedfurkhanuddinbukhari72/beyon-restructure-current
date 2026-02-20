import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import KOTDashboard from '../components/kot/KOTDashboard';
import KOTDetail from '../components/kot/KOTDetail';
import KOTQueue from '../components/kot/KOTQueue';
import KOTStation from '../components/kot/KOTStation';
import { KOT_STATUS, KOTHelpers, KitchenStation } from '../models/kotModel';

const KOTDashboardPage = () => {
  const router = useRouter();
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedKOT, setSelectedKOT] = useState(null);
  const [kotData, setKOTData] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    initializeKOTSystem();
  }, []);

  // Effect to prevent auto-repopulation after clearing
  useEffect(() => {
    // This effect runs to monitor for potential auto-repopulation
    // We'll handle this differently since the standalone dashboard doesn't have localOrders dependency
  }, [isClearing]);

  const initializeKOTSystem = async () => {
    try {
      setLoading(true);
      
      // Load existing orders and convert to KOT format
      await loadKOTData();
      
      // Initialize kitchen stations
      await initializeStations();
      
      setIsInitialized(true);
      setLoading(false);
    } catch (error) {
      console.error('Error initializing KOT system:', error);
      setLoading(false);
    }
  };

  const mapOrderStatusToKOT = (orderStatus) => {
    switch (orderStatus) {
      case 'pending': return KOT_STATUS.PENDING;
      case 'confirmed': return KOT_STATUS.CONFIRMED;
      case 'preparing': return KOT_STATUS.PREPARING;
      case 'ready': return KOT_STATUS.READY;
      case 'completed': return KOT_STATUS.COMPLETED;
      case 'cancelled': return KOT_STATUS.CANCELLED;
      default: return KOT_STATUS.PENDING;
    }
  };

  const mapKOTStatusToOrder = (kotStatus) => {
    switch (kotStatus) {
      case KOT_STATUS.PENDING: return 'pending';
      case KOT_STATUS.CONFIRMED: return 'confirmed';
      case KOT_STATUS.PREPARING: return 'preparing';
      case KOT_STATUS.READY: return 'ready';
      case KOT_STATUS.COMPLETED: return 'completed';
      case KOT_STATUS.CANCELLED: return 'cancelled';
      default: return 'pending';
    }
  };

  const loadKOTData = async () => {
    try {
      // Load local orders
      const response = await fetch('/api/local-orders');
      const orders = await response.json();
      
      // Convert orders to KOT format with preservation of existing data
      const newKOTData = orders.map(order => {
        // Check if this KOT already exists
        const existingKOT = kotData.find(kot => kot.orderId === order._id);
        
        return {
          id: existingKOT?.id || KOTHelpers.generateKOTId(),
          orderId: order._id,
          tableNumber: order.tableNumber || null,
          orderType: order.orderType || 'takeaway',
          customerName: order.customerName || null,
          priority: order.priority || 'normal',
          status: mapOrderStatusToKOT(order.status),
          items: order.items.map((item, index) => {
            const existingItem = existingKOT?.items.find(i => i.name === item.name && i.quantity === item.qty);
            
            return {
              id: existingItem?.id || `${order._id}-item-${index}`,
              name: item.name,
              quantity: item.qty,
              unitPrice: item.price,
              status: mapOrderStatusToKOT(order.status),
              notes: item.notes || '',
              category: getItemCategory(item.name),
              preparationTime: getEstimatedPrepTime(item.name),
              actualPrepTime: existingItem?.actualPrepTime || null,
              startedAt: existingItem?.startedAt || null,
              completedAt: order.status === 'completed' ? order.updatedAt : existingItem?.completedAt || null,
              assignedTo: existingItem?.assignedTo || null,
              modifications: existingItem?.modifications || []
            };
          }),
          totalAmount: order.total,
          createdAt: order.createdAt,
          confirmedAt: existingKOT?.confirmedAt || null,
          startedAt: existingKOT?.startedAt || null,
          completedAt: order.status === 'completed' ? order.updatedAt : existingKOT?.completedAt || null,
          estimatedTime: KOTHelpers.calculateEstimatedTime(
            order.items.map(item => ({ preparationTime: getEstimatedPrepTime(item.name) }))
          ),
          actualTime: existingKOT?.actualTime || null,
          notes: order.note || '',
          source: order.source || 'local',
          modifications: existingKOT?.modifications || [],
          kitchenNotes: existingKOT?.kitchenNotes || '',
          specialInstructions: existingKOT?.specialInstructions || ''
        };
      });
      
      setKOTData(newKOTData);
    } catch (error) {
      console.error('Error loading KOT data:', error);
      // Fallback to empty array
      setKOTData([]);
    }
  };

  const initializeStations = async () => {
    const defaultStations = [
      {
        id: 'grill-station',
        name: 'Grill Station',
        description: 'Grilled items and sandwiches',
        categories: ['sandwich', 'wrap', 'grill'],
        capacity: 5,
        currentLoad: 0,
        status: 'active',
        assignedItems: []
      },
      {
        id: 'fryer-station',
        name: 'Fryer Station',
        description: 'Fried items and snacks',
        categories: ['fried', 'snacks', 'popcorn'],
        capacity: 8,
        currentLoad: 0,
        status: 'active',
        assignedItems: []
      },
      {
        id: 'cold-prep',
        name: 'Cold Prep Station',
        description: 'Cold beverages and desserts',
        categories: ['beverage', 'dessert', 'cold'],
        capacity: 3,
        currentLoad: 0,
        status: 'active',
        assignedItems: []
      },
      {
        id: 'assembly',
        name: 'Assembly Station',
        description: 'Final order assembly',
        categories: ['combo', 'complete'],
        capacity: 4,
        currentLoad: 0,
        status: 'active',
        assignedItems: []
      }
    ];
    
    setStations(defaultStations);
  };

  const getItemCategory = (itemName) => {
    const name = itemName.toLowerCase();
    
    if (name.includes('sandwich') || name.includes('wrap')) return 'sandwich';
    if (name.includes('chicken') && (name.includes('popcorn') || name.includes('fried'))) return 'fried';
    if (name.includes('burger')) return 'grill';
    if (name.includes('drink') || name.includes('juice') || name.includes('coke')) return 'beverage';
    if (name.includes('ice cream') || name.includes('dessert')) return 'dessert';
    
    return 'general';
  };

  const getEstimatedPrepTime = (itemName) => {
    const name = itemName.toLowerCase();
    
    if (name.includes('sandwich')) return 8;
    if (name.includes('wrap')) return 10;
    if (name.includes('burger')) return 12;
    if (name.includes('chicken') && name.includes('popcorn')) return 15;
    if (name.includes('fried')) return 10;
    if (name.includes('drink') || name.includes('juice')) return 3;
    if (name.includes('ice cream')) return 5;
    
    return 8; // default time
  };

  const handleKOTSelect = (kot) => {
    setSelectedKOT(kot);
    setActiveView('detail');
  };

  const handleKOTUpdate = async (updatedKOT) => {
    setKOTData(prev => prev.map(kot => 
      kot.id === updatedKOT.id ? updatedKOT : kot
    ));
    
    // Update selected KOT if it's the one being updated
    if (selectedKOT && selectedKOT.id === updatedKOT.id) {
      setSelectedKOT(updatedKOT);
    }

    // Update the original order in the backend
    try {
      const response = await fetch('/api/local-orders');
      const orders = await response.json();
      const existingOrder = orders.find(order => order._id === updatedKOT.orderId);
      
      if (existingOrder) {
        const updatedOrder = {
          ...existingOrder,
          status: mapKOTStatusToOrder(updatedKOT.status),
          updatedAt: updatedKOT.updatedAt || new Date().toISOString()
        };

        await fetch('/api/local-orders', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedOrder),
        });
        
        console.log(`Order ${updatedKOT.orderId} status updated to ${updatedKOT.status}`);
      }
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const handleStatusUpdate = async (kotId, newStatus) => {
    const kot = kotData.find(k => k.id === kotId);
    if (!kot) return;

    const updatedKOT = { ...kot, status: newStatus };
    
    if (newStatus === KOT_STATUS.PREPARING && !kot.startedAt) {
      updatedKOT.startedAt = new Date().toISOString();
    } else if (newStatus === KOT_STATUS.COMPLETED && kot.startedAt) {
      updatedKOT.completedAt = new Date().toISOString();
      updatedKOT.actualTime = Math.floor(
        (new Date(updatedKOT.completedAt) - new Date(kot.startedAt)) / 1000 / 60
      );
    }

    setKOTData(prev => prev.map(k => k.id === kotId ? updatedKOT : k));

    // Update the original order in the backend
    try {
      const response = await fetch('/api/local-orders');
      const orders = await response.json();
      const existingOrder = orders.find(order => order._id === kot.orderId);
      
      if (existingOrder) {
        const updatedOrder = {
          ...existingOrder,
          status: mapKOTStatusToOrder(newStatus),
          updatedAt: new Date().toISOString()
        };

        await fetch('/api/local-orders', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedOrder),
        });
        
        console.log(`Order ${kot.orderId} status updated to ${newStatus}`);
      }
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const handleStationUpdate = (stationId, updates) => {
    setStations(prev => prev.map(station => 
      station.id === stationId ? { ...station, ...updates } : station
    ));
  };

  const clearKOTData = () => {
    console.log('🧹 [STANDALONE] Clear KOT Data function called');
    
    // Set clearing flag to prevent auto-repopulation
    console.log('🚫 [STANDALONE] Setting isClearing to true');
    setIsClearing(true);
    
    // Clear ALL KOT data
    console.log('📊 [STANDALONE] Clearing kotData, current length:', kotData.length);
    setKOTData([]);
    
    console.log('🎯 [STANDALONE] Clearing selectedKOT');
    setSelectedKOT(null);
    
    console.log('👁️ [STANDALONE] Resetting activeView to dashboard');
    setActiveView('dashboard');
    
    console.log('🏭 [STANDALONE] Clearing stations, current count:', stations.length);
    setStations([]);
    
    console.log('🔄 [STANDALONE] Resetting isInitialized to false');
    setIsInitialized(false);
    
    console.log('💬 [STANDALONE] Clear operation completed');
    
    // Reset clearing flag after a short delay
    console.log('⏰ [STANDALONE] Setting timer to reset isClearing flag');
    setTimeout(() => {
      console.log('✅ [STANDALONE] Resetting isClearing to false after delay');
      setIsClearing(false);
    }, 1000);
  };

  const reloadKOTData = () => {
    console.log('🔄 [STANDALONE] Reload KOT Data function called');
    
    // Re-initialize the system
    setIsInitialized(false);
    initializeKOTSystem();
    
    console.log('💬 [STANDALONE] KOT data reloaded');
  };

  const removeSpecificOrder = (orderId) => {
    // Remove specific order from KOT data
    setKOTData(prev => prev.filter(kot => kot.orderId !== orderId));
    
    // Clear selected KOT if it was the removed order
    if (selectedKOT && selectedKOT.orderId === orderId) {
      setSelectedKOT(null);
      setActiveView('dashboard');
    }
    
    console.log(`Order ${orderId} removed from KOT`);
  };

  // Auto-remove order 77 if it exists
  useEffect(() => {
    if (kotData.length > 0) {
      const order77 = kotData.find(kot => kot.orderId === '77' || kot.id.includes('77'));
      if (order77) {
        removeSpecificOrder(order77.orderId);
      }
    }
  }, [kotData]);

  const handleRefresh = () => {
    // Clear KOT data and reload fresh data
    clearKOTData();
    loadKOTData();
    console.log('KOT data refreshed');
  };

  const renderNavigation = () => (
    <div className="bg-white border-b border-gray-200">
      <div className="px-6">
        <nav className="flex space-x-8">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'queue', label: 'Queue', icon: '📋' },
            { id: 'stations', label: 'Stations', icon: '👨‍🍳' },
            { id: 'detail', label: 'Order Detail', icon: '📄', disabled: !selectedKOT }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              disabled={item.disabled}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeView === item.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    switch (activeView) {
      case 'dashboard':
        return (
          <KOTDashboard
            kotData={kotData}
            onKOTSelect={handleKOTSelect}
            onClearKOT={() => {
              console.log('🔘 [STANDALONE] Clear All Data button clicked');
              console.log('🔍 [STANDALONE] About to call clearKOTData');
              clearKOTData();
            }}
            onReloadKOT={() => {
              console.log('🔄 [STANDALONE] Reload Data button clicked');
              console.log('🔍 [STANDALONE] About to call reloadKOTData');
              reloadKOTData();
            }}
          />
        );
      
      case 'queue':
        return (
          <KOTQueue
            kotData={kotData}
            onKOTSelect={handleKOTSelect}
            onStatusUpdate={handleStatusUpdate}
          />
        );
      
      case 'stations':
        return (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {stations.map((station) => (
                <KOTStation
                  key={station.id}
                  station={station}
                  kotData={kotData}
                  onStationUpdate={handleStationUpdate}
                />
              ))}
            </div>
          </div>
        );
      
      case 'detail':
        return (
          <KOTDetail
            kot={selectedKOT}
            onUpdate={handleKOTUpdate}
            onClose={() => {
              setSelectedKOT(null);
              setActiveView('dashboard');
            }}
          />
        );
      
      default:
        return (
          <div className="p-8 text-center">
            <p className="text-gray-500">View not found</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderNavigation()}
      {renderContent()}
    </div>
  );
};

export default KOTDashboardPage;
