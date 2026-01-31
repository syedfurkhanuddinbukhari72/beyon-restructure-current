import React, { useState, useEffect, useRef, useCallback } from 'react';
import KOTDashboard from '../../kot/KOTDashboard';
import KOTOrders from '../../kot/KOTOrders';
import KOTDetail from '../../kot/KOTDetail';
import KOTQueue from '../../kot/KOTQueue';
import KOTStation from '../../kot/KOTStation';
import { KOT_STATUS, KOTHelpers, KitchenStation } from '../../../models/kotModel';

const KOTTab = ({ localOrders, onLocalOrderUpdate, showToast }) => {
  // Debug: Log what we receive
  console.log('🔍 KOTTab mounted with localOrders:', localOrders?.length || 0);
  console.log('📋 localOrders sample:', localOrders?.slice(0, 3).map(o => ({
    _id: o._id,
    status: o.status,
    source: o.source,
    kotCompleted: o.kotCompleted,
    itemCount: o.items?.length || 0
  })) || []);
  
  // Add refs to prevent infinite loops
  const isConvertingRef = useRef(false);
  const lastConversionTimeRef = useRef(0);
  const hasInitializedRef = useRef(false);
  const isMounted = useRef(true);
  
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedKOT, setSelectedKOT] = useState(null);
  const [kotData, setKOTData] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [processedOrderIds, setProcessedOrderIds] = useState(() => {
    try {
      const storedIds = JSON.parse(localStorage.getItem('processedKOTOrderIds') || '[]');
      console.log('📥 Initial load of processed IDs:', storedIds.length);
      return new Set(storedIds);
    } catch (e) {
      console.warn('Failed to load processed IDs:', e);
      return new Set();
    }
  });

  const [hasBeenCleared, setHasBeenCleared] = useState(() => {
    const stored = localStorage.getItem('kotTabHasBeenCleared');
    return stored === 'true';
  });

  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Track localOrders changes
  useEffect(() => {
    console.log('🔄 KOTTab localOrders changed:', {
      count: localOrders?.length || 0,
      sources: localOrders?.map(o => o.source) || [],
      statuses: localOrders?.map(o => o.status) || []
    });
  }, [localOrders]);

  // Add global console function for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.deleteAllKOTData = () => {
        console.log('🗑️ Deleting all KOT data from console...');
        localStorage.removeItem('kotTabData');
        localStorage.removeItem('processedKOTOrderIds');
        localStorage.setItem('kotTabHasBeenCleared', 'true');
        console.log('✅ All KOT data deleted from localStorage');
        return 'KOT data deleted. Refresh page to see changes.';
      };

      window.clearAllOrderData = async () => {
        console.log('🗑️ Clearing ALL order data from localStorage and localforage...');
        localStorage.removeItem('kotTabData');
        localStorage.removeItem('processedKOTOrderIds');
        localStorage.removeItem('kotTabHasBeenCleared');
        
        try {
          const localforage = await import('localforage');
          await localforage.default.clear();
          console.log('✅ Cleared all localforage data');
        } catch (e) {
          console.warn('Failed to clear localforage:', e);
        }
        
        return 'All order data cleared. Refresh page to see changes.';
      };
      
      console.log('💡 Console commands available:');
      console.log('  - window.deleteAllKOTData()');
      console.log('  - window.clearAllOrderData()');
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete window.deleteAllKOTData;
        delete window.clearAllOrderData;
      }
    };
  }, []);

  // Listen for KOT update events and refresh KOT data
  useEffect(() => {
    const handleKOTUpdate = () => {
      console.log('🔄 KOTTab: Refreshing KOT data after update...');
      const savedKOTData = localStorage.getItem('kotTabData');
      if (savedKOTData) {
        try {
          const parsed = JSON.parse(savedKOTData);
          setKOTData(parsed);
          console.log('🔄 KOTTab: Reloaded KOT data:', parsed.length);
        } catch (e) {
          console.warn('🔄 KOTTab: Failed to reload KOT data:', e);
        }
      }
    };

    window.addEventListener('kot:updated', handleKOTUpdate);
    return () => window.removeEventListener('kot:updated', handleKOTUpdate);
  }, []);

  // CRITICAL: Initialize component and set loading to false
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    
    console.log('🚀 KOTTab initializing...');
    
    const savedKOTData = localStorage.getItem('kotTabData');
    if (savedKOTData && !hasBeenCleared) {
      try {
        const parsed = JSON.parse(savedKOTData);
        setKOTData(parsed);
        console.log('📥 Loaded KOT data from localStorage:', parsed.length);
      } catch (e) {
        console.warn('Failed to load KOT data from localStorage:', e);
      }
    }
    
    setLoading(false);
    console.log('✅ KOTTab initialized, loading set to false');
  }, [hasBeenCleared]);

  // Sync processedOrderIds to localStorage when it changes
  useEffect(() => {
    if (processedOrderIds.size > 0) {
      const idsArray = Array.from(processedOrderIds);
      localStorage.setItem('processedKOTOrderIds', JSON.stringify(idsArray));
      console.log('💾 Synced processedOrderIds to localStorage:', idsArray.length);
    }
  }, [processedOrderIds]);

  // Sync hasBeenCleared changes to localStorage
  useEffect(() => {
    localStorage.setItem('kotTabHasBeenCleared', hasBeenCleared.toString());
  }, [hasBeenCleared]);

  // Save KOT data whenever it changes (but not during clearing)
  useEffect(() => {
    if (kotData.length > 0 && !isClearing) {
      localStorage.setItem('kotTabData', JSON.stringify(kotData));
    }
  }, [kotData, isClearing]);

  // Convert manual orders to KOTs
  useEffect(() => {
    if (loading) {
      console.log('⏸️ Still loading, skipping conversion');
      return;
    }

    if (isConvertingRef.current) {
      console.log('⏸️ Conversion already in progress');
      return;
    }

    const now = Date.now();
    if (now - lastConversionTimeRef.current < 2000) {
      console.log('⏸️ Debouncing conversion, too soon since last conversion');
      return;
    }

    if (!localOrders || localOrders.length === 0) {
      console.log('⏸️ No local orders to convert');
      return;
    }

    isConvertingRef.current = true;
    lastConversionTimeRef.current = now;

    const processOrders = () => {
      if (!isMounted.current) return;

      try {
        let processedSet;
        try {
          const stored = localStorage.getItem('processedKOTOrderIds');
          processedSet = new Set(stored ? JSON.parse(stored) : []);
        } catch (e) {
          console.warn('Failed to load processed IDs:', e);
          processedSet = new Set();
        }

        // Find unprocessed MANUAL orders only
        const unprocessedOrders = localOrders.filter(order => {
          if (!order?._id) return false;
          
          const isManualOrder = order.source === 'manual' || 
                               order._id?.startsWith('local-') || 
                               order._id?.startsWith('manual-');
          
          if (!isManualOrder) return false;
          
          const status = typeof order.status === 'string' ? order.status : 'unknown';
          const validStatuses = ['pending', 'confirmed', 'preparing', 'new', 'created', 'manual'];
          const isValidStatus = validStatuses.includes(status);
          const isNotReady = status !== 'ready' && !order.kotCompleted;
          const isProcessed = processedSet.has(order._id);

          return !isProcessed && isValidStatus && isNotReady;
        });

        if (unprocessedOrders.length === 0) {
          console.log('✅ No new manual orders to process');
          return;
        }

        console.log(`🎯 Found ${unprocessedOrders.length} manual orders to convert to KOTs`);

        const newKOTs = unprocessedOrders.map(order => {
          processedSet.add(order._id);
          
          return {
            id: `KOT-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
            orderId: order._id,
            status: KOT_STATUS.PENDING,
            items: (order.items || []).map((item, itemIndex) => ({
              ...item,
              id: item.id || `${order._id}-item-${itemIndex}`,
              status: 'pending'
            })),
            createdAt: order.createdAt || new Date().toISOString(),
            customerName: order.customerName || `Manual Order ${order._id.slice(-4)}`,
            total: order.total || 0,
            source: 'manual'
          };
        });

        if (!isMounted.current) return;
        
        const updatedProcessedIds = Array.from(processedSet);
        localStorage.setItem('processedKOTOrderIds', JSON.stringify(updatedProcessedIds));
        
        setKOTData(prev => {
          const combined = [...prev, ...newKOTs].slice(-100);
          localStorage.setItem('kotTabData', JSON.stringify(combined));
          return combined;
        });

        setProcessedOrderIds(processedSet);
        console.log(`✅ Processed ${newKOTs.length} manual orders to KOTs`);

      } catch (error) {
        console.error('❌ Error in manual order processing:', error);
      } finally {
        if (isMounted.current) {
          setTimeout(() => {
            isConvertingRef.current = false;
          }, 1000);
        }
      }
    };

    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(processOrders);
    } else {
      setTimeout(processOrders, 0);
    }
  }, [localOrders, loading]);

  const handleStatusUpdate = useCallback((param1, param2) => {
    console.log('🔄 handleStatusUpdate called:', { param1, param2 });
    
    let kotId, newStatus, fullKOTUpdate = null;
    
    if (typeof param1 === 'object' && param1.id) {
      fullKOTUpdate = param1;
      kotId = param1.id;
      newStatus = param1.status;
      console.log('🔄 Received full KOT update:', {
        id: param1.id,
        status: param1.status,
        itemCount: param1.items?.length || 0
      });
    } else if (typeof param1 === 'string' && param2) {
      kotId = param1;
      newStatus = param2;
    } else {
      console.error('❌ Invalid parameters passed to handleStatusUpdate:', { param1, param2 });
      return;
    }
    
    setKOTData(prev => {
      const kotIndex = prev.findIndex(k => k.id === kotId);
      if (kotIndex === -1) return prev;

      const currentKOT = prev[kotIndex];
      let updatedKOT = fullKOTUpdate ? { ...fullKOTUpdate } : { ...currentKOT, status: newStatus };

      if (newStatus === KOT_STATUS.PREPARING && !currentKOT.startedAt) {
        updatedKOT.startedAt = new Date().toISOString();
      } else if (newStatus === KOT_STATUS.COMPLETED) {
        updatedKOT.completedAt = new Date().toISOString();
        if (currentKOT.startedAt) {
          updatedKOT.actualTime = Math.floor((new Date(updatedKOT.completedAt) - new Date(currentKOT.startedAt)) / 1000 / 60);
        }
      }

      const newData = [...prev];
      newData[kotIndex] = updatedKOT;
      localStorage.setItem('kotTabData', JSON.stringify(newData));

      // Handle KOT completion - update local order to move to Ready tab
      if (updatedKOT.status === KOT_STATUS.COMPLETED && onLocalOrderUpdate) {
        console.log('🎯 KOT completed, updating order to Ready status');
        
        const existingOrder = localOrders?.find(o => o._id === updatedKOT.orderId);
        const updatedOrder = existingOrder ? { 
          ...existingOrder, 
          status: 'ready', 
          kotCompleted: true,
          kotId: updatedKOT.id,
          updatedAt: new Date().toISOString()
        } : {
          _id: updatedKOT.orderId,
          status: 'ready',
          kotCompleted: true,
          kotId: updatedKOT.id,
          items: updatedKOT.items?.map(item => ({
            name: item.name,
            price: item.unitPrice || item.price || 0,
            quantity: item.quantity || item.qty || 1
          })) || [],
          total: updatedKOT.totalAmount || updatedKOT.total || 0,
          createdAt: updatedKOT.createdAt || new Date().toISOString(),
          source: 'kot',
          customerName: updatedKOT.customerName
        };
        
        console.log('🎯 KOT completion - created order:', {
          orderId: updatedOrder._id,
          status: updatedOrder.status,
          kotCompleted: updatedOrder.kotCompleted,
          kotId: updatedOrder.kotId,
          source: updatedOrder.source
        });
        
        onLocalOrderUpdate(updatedOrder);
        showToast?.(`Order ${updatedKOT.orderId} is now ready!`);

        // Trigger refresh event
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('kot:updated', {
            detail: { kotId: updatedKOT.id, status: updatedKOT.status }
          }));
        }, 100);
      }

      if (selectedKOT?.id === kotId) setSelectedKOT(updatedKOT);
      return newData;
    });
  }, [selectedKOT, localOrders, onLocalOrderUpdate, showToast]);

  const clearKOTData = useCallback(() => {
    console.log('🧹 Clear KOT Data function called');
    
    try {
      setIsClearing(true);

      const keysToRemove = ['kotTabData', 'processedKOTOrderIds', 'kotTabHasBeenCleared'];
      keysToRemove.forEach(key => localStorage.removeItem(key));

      setKOTData([]);
      setSelectedKOT(null);
      setActiveView('dashboard');
      setStations([]);
      setHasBeenCleared(false);
      setProcessedOrderIds(new Set());
      
      isConvertingRef.current = false;
      lastConversionTimeRef.current = 0;

      setTimeout(() => {
        setIsClearing(false);
        console.log('✅ All KOT data completely deleted');
        showToast?.('success', 'All KOT data cleared successfully');
      }, 100);
      
    } catch (error) {
      console.error('❌ Error clearing KOT data:', error);
      setIsClearing(false);
      showToast?.('error', 'Failed to clear KOT data');
    }
  }, [showToast]);

  const reloadKOTData = useCallback(() => {
    console.log('🔄 Reload KOT Data function called');
    
    setProcessedOrderIds(new Set());
    localStorage.removeItem('processedKOTOrderIds');
    setHasBeenCleared(false);
    
    isConvertingRef.current = false;
    lastConversionTimeRef.current = 0;
    
    showToast?.('KOT data will reload - cleared processed IDs');
  }, [showToast]);

  // Show loading state
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
          <button
            onClick={() => {
              if (window.confirm('⚠️ Are you sure you want to permanently delete ALL KOT data?\n\nThis will delete:\n• All KOT orders\n• All localStorage data\n• All processed IDs\n\nThis action cannot be undone!')) {
                clearKOTData();
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete All KOT Data
          </button>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200">
        <div className="flex space-x-1 px-6">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'orders', label: 'Orders', icon: '📋' },
            { id: 'station', label: 'Kitchen Station', icon: '👨‍🍳' },
            { id: 'queue', label: 'Queue', icon: '⏱️' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeView === tab.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeView === 'dashboard' && (
          <KOTDashboard
            kotData={kotData}
            onKOTSelect={(kot) => {
              setSelectedKOT(kot);
              setActiveView('detail');
            }}
            onStatusUpdate={handleStatusUpdate}
            onClearKOT={clearKOTData}
            onReloadKOT={reloadKOTData}
          />
        )}
        {activeView === 'orders' && (
          <KOTOrders
            kotData={kotData}
            onKOTSelect={(kot) => {
              setSelectedKOT(kot);
              setActiveView('detail');
            }}
            onStatusUpdate={handleStatusUpdate}
          />
        )}
        {activeView === 'station' && (
          <KOTStation
            kotData={kotData}
            stations={stations}
            onStatusUpdate={handleStatusUpdate}
            onStationUpdate={setStations}
          />
        )}
        {activeView === 'detail' && selectedKOT && (
          <KOTDetail
            kot={selectedKOT}
            onUpdate={handleStatusUpdate}
            onClose={() => {
              setActiveView('dashboard');
            }}
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