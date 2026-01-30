import React, { useState, useEffect, useRef, useCallback } from 'react';
import KOTDashboard from '../../kot/KOTDashboard';
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
  const [loading, setLoading] = useState(true); // Will be set to false after initialization
  const [isClearing, setIsClearing] = useState(false);
  
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

  // Listen for KOT update events and refresh KOT data
  useEffect(() => {
    const handleKOTUpdate = () => {
      console.log('🔄 KOTTab: Refreshing KOT data after update...');
      // Reload KOT data from localStorage to get latest updates
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

  // Initialize hasBeenCleared from localStorage
  const [hasBeenCleared, setHasBeenCleared] = useState(() => {
    const stored = localStorage.getItem('kotTabHasBeenCleared');
    return stored === 'true';
  });

  // CRITICAL: Initialize component and set loading to false
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    
    console.log('🚀 KOTTab initializing...');
    
    // Load persisted KOT data
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
    
    // IMPORTANT: Set loading to false after initialization
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

  // Fixed useEffect to convert orders to KOT - with proper guards
  useEffect(() => {
    // Don't run if component is unmounted or still loading
    if (loading || !isMounted.current) {
      console.log('⏸️ Skipping conversion - loading or unmounted');
      return;
    }

    // Prevent multiple conversions
    if (isConvertingRef.current) {
      console.log('⏸️ Conversion already in progress');
      return;
    }

    // Debounce to prevent rapid consecutive runs
    const now = Date.now();
    if (now - lastConversionTimeRef.current < 2000) {
      console.log('⏸️ Debouncing conversion');
      return;
    }

    // Skip if no orders to process
    if (!localOrders?.length) {
      console.log('⏸️ No local orders to process');
      return;
    }

    // Set conversion flag
    isConvertingRef.current = true;
    lastConversionTimeRef.current = now;

    // Process orders in next tick to avoid state update during render
    const processOrders = () => {
      if (!isMounted.current) return;

      try {
        // Get processed IDs from localStorage
        let processedSet;
        try {
          const stored = localStorage.getItem('processedKOTOrderIds');
          processedSet = new Set(stored ? JSON.parse(stored) : []);
        } catch (e) {
          console.warn('Failed to load processed IDs:', e);
          processedSet = new Set();
        }

        // Find unprocessed orders
        console.log('🔍 DEBUG: Starting order conversion process');
        console.log('📊 Total localOrders:', localOrders?.length || 0);
        console.log('📊 Processed IDs in localStorage:', processedSet.size);
        console.log('📊 Processed IDs list:', Array.from(processedSet));
        
        const unprocessedOrders = localOrders.filter((order, index) => {
          console.log(`🔍 Checking order ${index}:`, {
            _id: order._id,
            status: order.status,
            statusType: typeof order.status,
            kotCompleted: order.kotCompleted,
            source: order.source,
            hasItems: !!(order.items && order.items.length > 0),
            isManual: order.source === 'manual' || order._id?.startsWith('local-')
          });
          
          if (!order?._id) {
            console.log(`❌ Order ${index} missing _id`);
            return false;
          }
          
          const status = typeof order.status === 'string' ? order.status : 'unknown';
          const validStatuses = ['pending', 'confirmed', 'preparing', 'new', 'created', 'manual'];
          const isValidStatus = validStatuses.includes(status);
          const isNotReady = status !== 'ready' && !order.kotCompleted;
          const isProcessed = processedSet.has(order._id);
          
          // Special check for manual orders
          const isManualOrder = order.source === 'manual' || order._id?.startsWith('local-');
          
          console.log(`📋 Order ${order._id} analysis:`, {
            status,
            isValidStatus,
            isNotReady,
            isProcessed,
            isManualOrder,
            shouldProcess: !isProcessed && isValidStatus && isNotReady
          });

          // For manual orders, be more lenient with status
          if (isManualOrder) {
            const shouldProcessManual = !isProcessed && isNotReady && (isValidStatus || status === 'new' || status === 'created');
            console.log(`🔧 Manual order ${order._id} special processing:`, {
              shouldProcessManual,
              reason: !isProcessed ? 'not processed' : 'already processed',
              statusCheck: isValidStatus ? 'valid status' : `invalid status: ${status}`
            });
            return shouldProcessManual;
          }

          return !isProcessed && isValidStatus && isNotReady;
        });

        console.log('🎯 Unprocessed orders found:', unprocessedOrders.length);
        console.log('📋 Unprocessed orders details:', unprocessedOrders.map(o => ({
          _id: o._id,
          status: o.status,
          source: o.source,
          itemCount: o.items?.length || 0
        })));

        // Specific manual order summary
        const manualOrders = localOrders.filter(order => 
          order.source === 'manual' || order._id?.startsWith('local-')
        );
        console.log('🔧 Manual Orders Summary:', {
          totalManualOrders: manualOrders.length,
          processedManualOrders: manualOrders.filter(o => processedSet.has(o._id)).length,
          unprocessedManualOrders: manualOrders.filter(o => !processedSet.has(o._id)).length,
          manualOrderDetails: manualOrders.map(o => ({
            _id: o._id,
            status: o.status,
            isProcessed: processedSet.has(o._id),
            hasItems: !!(o.items && o.items.length > 0)
          }))
        });

        if (unprocessedOrders.length === 0) {
          console.log('✅ No new orders to process - all orders already processed or invalid');
          return;
        }

        // Create new KOTs
        console.log('🏗️ Creating KOTs from unprocessed orders...');
        const newKOTs = unprocessedOrders.map((order, index) => {
          console.log(`🔧 Creating KOT ${index} from order:`, {
            orderId: order._id,
            customerName: order.customerName,
            itemCount: order.items?.length || 0,
            total: order.total
          });
          
          processedSet.add(order._id);
          
          const kot = {
            id: `KOT-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
            orderId: order._id,
            status: KOT_STATUS.PENDING,
            items: (order.items || []).map((item, itemIndex) => {
              console.log(`📦 Processing item ${itemIndex}:`, item.name || item);
              return {
                ...item,
                id: item.id || `${order._id}-item-${itemIndex}`,
                status: 'pending'
              };
            }),
            createdAt: order.createdAt || new Date().toISOString(),
            customerName: order.customerName || `Order ${order._id.slice(-4)}`,
            total: order.total || 0,
            source: 'local'
          };
          
          console.log(`✅ Created KOT:`, {
            id: kot.id,
            orderId: kot.orderId,
            status: kot.status,
            itemCount: kot.items.length,
            customerName: kot.customerName
          });
          
          return kot;
        });

        console.log('🎉 All KOTs created:', newKOTs.length);
        console.log('📊 KOT details:', newKOTs.map(k => ({
          id: k.id,
          orderId: k.orderId,
          status: k.status,
          itemCount: k.items.length
        })));

        // Update state in a single batch
        if (!isMounted.current) return;
        
        // Update processed IDs
        const updatedProcessedIds = Array.from(processedSet);
        localStorage.setItem('processedKOTOrderIds', JSON.stringify(updatedProcessedIds));
        console.log('💾 Updated processed IDs in localStorage:', updatedProcessedIds.length);
        
        // Update KOT data
        setKOTData(prev => {
          const combined = [...prev, ...newKOTs].slice(-100); // Keep only last 100
          localStorage.setItem('kotTabData', JSON.stringify(combined));
          console.log('💾 Updated KOT data in localStorage:', combined.length);
          console.log('📋 Current KOTs:', combined.map(k => ({
            id: k.id,
            status: k.status,
            customerName: k.customerName
          })));
          return combined;
        });

        // Update processed IDs state
        setProcessedOrderIds(processedSet);

        console.log(`✅ Successfully processed ${newKOTs.length} orders to KOTs`);

      } catch (error) {
        console.error('❌ Error in order processing:', error);
      } finally {
        if (isMounted.current) {
          setTimeout(() => {
            isConvertingRef.current = false;
          }, 1000);
        }
      }
    };

    // Use requestIdleCallback if available, otherwise use setTimeout
    if (window.requestIdleCallback) {
      requestIdleCallback(processOrders);
    } else {
      setTimeout(processOrders, 0);
    }
  }, [localOrders, loading]); // Only depend on localOrders and loading

  const handleStatusUpdate = useCallback((param1, param2) => {
    console.log('🔄 handleStatusUpdate called:', { param1, param2 });
    
    // Handle both formats: (kotId, newStatus) or (updatedKOTObject)
    let kotId, newStatus, fullKOTUpdate = null;
    
    if (typeof param1 === 'object' && param1.id) {
      // Format: (updatedKOTObject) - This is what KOTDetail sends
      fullKOTUpdate = param1;
      kotId = param1.id;
      newStatus = param1.status;
      console.log('🔄 Received full KOT update:', {
        id: param1.id,
        status: param1.status,
        itemCount: param1.items?.length || 0,
        itemStatuses: param1.items?.map(i => ({ name: i.name, status: i.status })) || []
      });
    } else if (typeof param1 === 'string' && param2) {
      // Format: (kotId, newStatus)
      kotId = param1;
      newStatus = param2;
    } else {
      console.error('❌ Invalid parameters passed to handleStatusUpdate:', { param1, param2 });
      return;
    }
    
    console.log('🔄 Processing KOT update:', { kotId, newStatus, hasFullUpdate: !!fullKOTUpdate });
    
    setKOTData(prev => {
      let kotIndex = prev.findIndex(k => k.id === kotId);
      let currentKOT = null;
      
      // If not found in state, check localStorage as fallback
      if (kotIndex === -1) {
        try {
          const localStorageKOTs = JSON.parse(localStorage.getItem('kotTabData') || '[]');
          console.log('🔍 DEBUG: Looking for KOT:', kotId);
          console.log('🔍 DEBUG: KOTs in localStorage:', localStorageKOTs.map(k => k.id));
          
          const localStorageKOT = localStorageKOTs.find(k => k.id === kotId);
          if (localStorageKOT) {
            console.log('🔄 Found KOT in localStorage:', kotId);
            currentKOT = localStorageKOT;
            kotIndex = localStorageKOTs.findIndex(k => k.id === kotId);
          }
        } catch (e) {
          console.warn('🔄 Failed to check localStorage for KOT:', e);
        }
      } else {
        currentKOT = prev[kotIndex];
      }
      
      let updatedKOT;
      
      // If we have a full KOT update from KOTDetail, use it directly
      if (fullKOTUpdate) {
        updatedKOT = { ...fullKOTUpdate };
        console.log('✅ Using full KOT update from KOTDetail');
        
        // Check if this is a completion update
        if (fullKOTUpdate.status === KOT_STATUS.COMPLETED) {
          console.log('🎯 Full KOT update is COMPLETED, will update order to Ready status');
        }
      } else if (currentKOT) {
        // Otherwise, just update the status
        updatedKOT = { ...currentKOT, status: newStatus };
        
        // Add timestamps
        if (newStatus === KOT_STATUS.PREPARING && !currentKOT.startedAt) {
          updatedKOT.startedAt = new Date().toISOString();
        } else if (newStatus === KOT_STATUS.COMPLETED) {
          updatedKOT.completedAt = new Date().toISOString();
          if (currentKOT.startedAt) {
            updatedKOT.actualTime = Math.floor(
              (new Date(updatedKOT.completedAt) - new Date(currentKOT.startedAt)) / 1000 / 60
            );
          }
        }
        console.log('✅ Created status-only update');
      } else {
        console.error('❌ No current KOT found for update');
        return prev;
      }
      
      // Update the KOT in state
      const newData = [...prev];
      if (kotIndex >= 0) {
        newData[kotIndex] = updatedKOT;
      } else {
        newData.push(updatedKOT);
      }
      
      // Also update localStorage
      try {
        const localStorageKOTs = JSON.parse(localStorage.getItem('kotTabData') || '[]');
        const lsIndex = localStorageKOTs.findIndex(k => k.id === kotId);
        if (lsIndex >= 0) {
          localStorageKOTs[lsIndex] = updatedKOT;
        } else {
          localStorageKOTs.push(updatedKOT);
        }
        localStorage.setItem('kotTabData', JSON.stringify(localStorageKOTs));
        console.log('🔄 Updated KOT in localStorage:', kotId);
      } catch (e) {
        console.warn('🔄 Failed to update localStorage:', e);
      }
      
      // Handle KOT completion - update local order to move to Ready tab
      const isKOTCompleted = updatedKOT.status === KOT_STATUS.COMPLETED;
      
      if (isKOTCompleted && onLocalOrderUpdate) {
        console.log('🎯 KOT completed, updating order to Ready status');
        
        const existingOrder = localOrders?.find(order =>
          order._id === updatedKOT.orderId || order.kotId === updatedKOT.id
        );

        if (existingOrder) {
          const updatedOrder = {
            ...existingOrder,
            status: 'ready',
            kotCompleted: true,
            kotId: updatedKOT.id,
            updatedAt: new Date().toISOString()
          };
          console.log('📝 Updating existing order to Ready status:', updatedOrder._id);
          onLocalOrderUpdate(updatedOrder);
          showToast?.(`Order ${updatedKOT.orderId || updatedKOT.id} is now ready!`);
        } else {
          // Create new order from KOT
          const newOrder = {
            _id: updatedKOT.orderId || updatedKOT.id,
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
            customerName: updatedKOT.customerName,
            tableNumber: updatedKOT.tableNumber,
            orderType: updatedKOT.orderType
          };
          console.log('🆕 Creating new local order as Ready:', newOrder._id);
          onLocalOrderUpdate(newOrder);
          showToast?.(`KOT ${updatedKOT.id} completed and moved to Ready tab!`);
        }

        // TRIGGER REFRESH: Force order data refresh after KOT update
        setTimeout(() => {
          console.log('🔄 Triggering order data refresh after KOT completion...');
          // This will trigger the bridge function and sync data
          window.dispatchEvent(new CustomEvent('kot:updated', {
            detail: { kotId: updatedKOT.id, status: updatedKOT.status }
          }));
        }, 100);
      }
      
      // Update selectedKOT if it's the one being updated
      if (selectedKOT && selectedKOT.id === kotId) {
        console.log('🔄 KOTTab - Updating selectedKOT:', updatedKOT.status);
        setSelectedKOT(updatedKOT);
      }
      
      return newData;
    });
  }, [selectedKOT, localOrders, onLocalOrderUpdate, showToast]);

  const clearKOTData = useCallback(() => {
    console.log('🧹 Clear KOT Data function called - COMPLETE DELETE');
    
    try {
      setIsClearing(true);

      // Clear all KOT-related localStorage data
      const keysToRemove = [
        'kotTabData',
        'processedKOTOrderIds', 
        'kotTabHasBeenCleared',
        'kotTabClearedOrderIds',
        'clearedOrderIds',
        'kotStations',
        'kotViewSettings'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Removed localStorage key: ${key}`);
      });

      // Clear all React state
      setKOTData([]);
      setSelectedKOT(null);
      setActiveView('dashboard');
      setStations([]);
      setHasBeenCleared(false);
      setProcessedOrderIds(new Set());
      
      // Reset refs
      isConvertingRef.current = false;
      lastConversionTimeRef.current = 0;

      setTimeout(() => {
        setIsClearing(false);
        console.log('✅ All KOT data completely deleted');
        if (showToast) {
          showToast('success', 'All KOT data cleared successfully');
        }
      }, 100);
      
    } catch (error) {
      console.error('❌ Error clearing KOT data:', error);
      setIsClearing(false);
      if (showToast) {
        showToast('error', 'Failed to clear KOT data');
      }
    }
  }, [showToast]);

  const reloadKOTData = useCallback(() => {
    console.log('🔄 Reload KOT Data function called');
    
    // Clear processed IDs to allow re-conversion
    setProcessedOrderIds(new Set());
    localStorage.removeItem('processedKOTOrderIds');
    setHasBeenCleared(false);
    
    // Reset conversion refs
    isConvertingRef.current = false;
    lastConversionTimeRef.current = 0;
    
    showToast?.('KOT data will reload - cleared processed IDs');
  }, [showToast]);

  const clearProcessedIds = useCallback(() => {
    console.log('🧹 Clearing processed IDs for testing...');
    
    // Clear processed IDs from localStorage and state
    localStorage.removeItem('processedKOTOrderIds');
    setProcessedOrderIds(new Set());
    
    // Reset conversion refs to force immediate processing
    isConvertingRef.current = false;
    lastConversionTimeRef.current = 0;
    
    showToast?.('Processed IDs cleared - manual orders should now appear');
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
          <div className="flex gap-2">
            <button
              onClick={clearProcessedIds}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Clear Processed IDs
            </button>
            <button
              onClick={reloadKOTData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reload Data
            </button>
            <button
              onClick={() => {
                const testOrder = {
                  _id: `manual-test-${Date.now()}`,
                  status: 'pending',
                  source: 'manual',
                  items: [
                    { name: 'Test Burger', price: 10, quantity: 1 },
                    { name: 'Test Fries', price: 5, quantity: 1 }
                  ],
                  total: 15,
                  createdAt: new Date().toISOString(),
                  customerName: 'Test Customer'
                };
                
                console.log('🧪 Creating test manual order:', testOrder);
                
                // Create KOT directly from this order
                const newKOT = {
                  id: `KOT-${Date.now()}`,
                  orderId: testOrder._id,
                  status: 'PENDING',
                  items: testOrder.items.map(item => ({
                    ...item,
                    status: 'pending'
                  })),
                  createdAt: testOrder.createdAt,
                  customerName: testOrder.customerName,
                  total: testOrder.total,
                  source: 'manual'
                };
                
                // Add KOT directly to state
                setKOTData(prev => [...prev, newKOT]);
                console.log('✅ Created KOT directly:', newKOT);
                showToast('Test manual KOT created successfully!');
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Create Test Manual KOT (Direct)
            </button>
            <button
              onClick={() => {
                if (window.confirm('⚠️ Are you sure you want to DELETE ALL KOT data?\n\nThis will permanently delete:\n• All KOT orders\n• Kitchen stations\n• Selected items\n• View settings\n• All cached data\n\nThis action cannot be undone!')) {
                  clearKOTData();
                }
              }}
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
            onKOTSelect={(kot) => {
              setSelectedKOT(kot);
              setActiveView('detail');
            }}
            onStatusUpdate={handleStatusUpdate}
            onClearKOT={clearKOTData}
            onReloadKOT={reloadKOTData}
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
