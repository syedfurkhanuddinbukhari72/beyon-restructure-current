import React, { useState, useEffect, useRef, useCallback } from 'react';
import KOTDashboard from '../../kot/KOTDashboard';
import KOTDetail from '../../kot/KOTDetail';
import KOTQueue from '../../kot/KOTQueue';
import KOTStation from '../../kot/KOTStation';
import { KOT_STATUS, KOTHelpers, KitchenStation } from '../../../models/kotModel';

const KOTTab = ({ localOrders, onLocalOrderUpdate, showToast }) => {
  // Add refs to prevent infinite loops
  const isConvertingRef = useRef(false);
  const lastConversionTimeRef = useRef(0);
  
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedKOT, setSelectedKOT] = useState(null);
  const [kotData, setKOTData] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  
  // Initialize processedOrderIds from localStorage on mount
  useEffect(() => {
    const storedIds = JSON.parse(localStorage.getItem('processedKOTOrderIds') || '[]');
    if (storedIds.length > 0) {
      setProcessedOrderIds(new Set(storedIds));
      console.log('📥 Loaded processed IDs from localStorage:', storedIds.length);
    }
    setIsInitialized(true);
  }, []);

  const [processedOrderIds, setProcessedOrderIds] = useState(new Set());

  // Sync processedOrderIds to localStorage
  useEffect(() => {
    if (processedOrderIds.size > 0) {
      localStorage.setItem('processedKOTOrderIds', JSON.stringify([...processedOrderIds]));
    }
  }, [processedOrderIds]);

  // Initialize hasBeenCleared from localStorage
  const [hasBeenCleared, setHasBeenCleared] = useState(() => {
    const stored = localStorage.getItem('kotTabHasBeenCleared');
    return stored === 'true';
  });

  // Sync hasBeenCleared changes to localStorage
  useEffect(() => {
    localStorage.setItem('kotTabHasBeenCleared', hasBeenCleared.toString());
  }, [hasBeenCleared]);

  // Load persisted KOT data on mount
  useEffect(() => {
    const savedKOTData = localStorage.getItem('kotTabData');
    if (savedKOTData && !hasBeenCleared) {
      try {
        setKOTData(JSON.parse(savedKOTData));
        console.log('📥 Loaded KOT data from localStorage:', JSON.parse(savedKOTData).length);
      } catch (e) {
        console.warn('Failed to load KOT data from localStorage:', e);
      }
    }
  }, [hasBeenCleared]);

  // Save KOT data whenever it changes
  useEffect(() => {
    if (kotData.length > 0 && !isClearing) {
      localStorage.setItem('kotTabData', JSON.stringify(kotData));
    }
  }, [kotData, isClearing]);

  // Fixed useEffect to prevent infinite loops
  useEffect(() => {
    // Prevent infinite loops
    if (isConvertingRef.current) {
      console.log('⏸️ Conversion already in progress, skipping...');
      return;
    }

    // Debounce: Don't convert more than once per second
    const now = Date.now();
    if (now - lastConversionTimeRef.current < 1000) {
      console.log('⏸️ Debouncing conversion, too soon since last conversion');
      return;
    }

    // Check if we have orders to convert
    if (!localOrders || localOrders.length === 0) {
      console.log('⏸️ No local orders to convert');
      return;
    }

    // Get processed IDs from localStorage
    const storedProcessedIds = JSON.parse(localStorage.getItem('processedKOTOrderIds') || '[]');
    const processedSet = new Set(storedProcessedIds);

    // Find orders that haven't been processed yet
    const unprocessedOrders = localOrders.filter(order => {
      const orderId = order._id;
      const isProcessed = processedSet.has(orderId);
      const isValidStatus = ['pending', 'confirmed', 'preparing'].includes(order.status);
      const isNotReady = order.status !== 'ready' && !order.kotCompleted;
      
      return !isProcessed && isValidStatus && isNotReady;
    });

    console.log('🔍 Unprocessed orders check:', {
      totalOrders: localOrders.length,
      processedCount: processedSet.size,
      unprocessedCount: unprocessedOrders.length
    });

    // Only convert if there are truly unprocessed orders
    if (unprocessedOrders.length === 0) {
      console.log('✅ All orders already processed, no conversion needed');
      return;
    }

    // Set flag to prevent re-entry
    isConvertingRef.current = true;
    lastConversionTimeRef.current = now;

    console.log(`🔄 Converting ${unprocessedOrders.length} new orders to KOT`);

    // Convert only unprocessed orders
    const newKOTs = unprocessedOrders.map(order => {
      const kotId = `KOT-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
      
      // Mark this order as processed IMMEDIATELY
      processedSet.add(order._id);
      
      return {
        id: kotId,
        orderId: order._id,
        status: 'pending',
        items: order.items?.map(item => ({
          ...item,
          status: 'pending'
        })) || [],
        createdAt: order.createdAt || new Date().toISOString(),
        customerName: order.customerName || order._id,
        total: order.total || 0,
        source: 'local'
      };
    });

    // Update localStorage FIRST
    const updatedProcessedIds = Array.from(processedSet);
    localStorage.setItem('processedKOTOrderIds', JSON.stringify(updatedProcessedIds));
    console.log('💾 Saved processed IDs to localStorage:', updatedProcessedIds.length);

    // Update KOT data state
    setKOTData(prev => {
      const combined = [...prev, ...newKOTs];
      const limited = combined.slice(-100);
      localStorage.setItem('kotTabData', JSON.stringify(limited));
      return limited;
    });

    // Update processed IDs state
    setProcessedOrderIds(processedSet);

    console.log(`✅ Converted ${newKOTs.length} orders, total processed: ${updatedProcessedIds.length}`);

    // Reset flag after a short delay
    setTimeout(() => {
      isConvertingRef.current = false;
    }, 500);

  }, [localOrders]);

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

  const clearKOTData = () => {
    console.log('🧹 Clear KOT Data function called - COMPLETE DELETE');

    // Clear all KOT-related localStorage data
    localStorage.removeItem('kotTabData');
    localStorage.removeItem('processedKOTOrderIds');
    localStorage.removeItem('kotTabHasBeenCleared');
    localStorage.removeItem('kotTabClearedOrderIds');
    localStorage.removeItem('clearedOrderIds');
    localStorage.removeItem('kotStations');
    localStorage.removeItem('kotViewSettings');

    // Clear all React state
    setKOTData([]);
    setSelectedKOT(null);
    setActiveView('dashboard');
    setStations([]);
    setIsInitialized(false);
    setIsClearing(false);
    setHasBeenCleared(false);
    setProcessedOrderIds(new Set());

    console.log('✅ All KOT data completely deleted');
    showToast('All KOT data permanently deleted');
  };

  const reloadKOTData = () => {
    console.log('🔄 Reload KOT Data function called');
    setProcessedOrderIds(new Set());
    localStorage.removeItem('processedKOTOrderIds');
    setHasBeenCleared(false);
    setIsInitialized(false);
    showToast('KOT data reloaded');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading KOT system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Kitchen Order Tickets</h1>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              {kotData.length} Active KOTs
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={reloadKOTData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reload Data
            </button>
            <button
              onClick={clearKOTData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete All KOT Data
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeView === 'dashboard' && (
          <KOTDashboard
            kotData={kotData}
            onKOTSelect={setSelectedKOT}
            onClearKOT={clearKOTData}
            onReloadKOT={reloadKOTData}
          />
        )}
        {activeView === 'detail' && selectedKOT && (
          <KOTDetail
            kot={selectedKOT}
            onBack={() => setActiveView('dashboard')}
            onStatusUpdate={handleStatusUpdate}
          />
        )}
        {activeView === 'queue' && (
          <KOTQueue
            kotData={kotData}
            onKOTSelect={setSelectedKOT}
            onStatusUpdate={handleStatusUpdate}
          />
        )}
      </div>
    </div>
  );
};

export default KOTTab;
