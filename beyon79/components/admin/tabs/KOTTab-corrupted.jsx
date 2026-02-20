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
  }, []); // Empty dependency - only run once on mount

  const [processedOrderIds, setProcessedOrderIds] = useState(new Set());

  // Sync processedOrderIds to localStorage
useEffect(() => {
  if (processedOrderIds.size > 0) {
    console.log('💾 Syncing processedOrderIds to localStorage:', processedOrderIds.size, 'IDs');
    localStorage.setItem('kotTabProcessedOrderIds', JSON.stringify([...processedOrderIds]));
  }
}, [processedOrderIds]);
  // Initialize hasBeenCleared from localStorage to persist across tab switches
  const [hasBeenCleared, setHasBeenCleared] = useState(() => {
    const stored = localStorage.getItem('kotTabHasBeenCleared');
    console.log('🔄 Initializing hasBeenCleared from localStorage:', stored);
    return stored === 'true';
  });

  // Sync hasBeenCleared changes to localStorage
  useEffect(() => {
    console.log('💾 Syncing hasBeenCleared to localStorage:', hasBeenCleared);
    localStorage.setItem('kotTabHasBeenCleared', hasBeenCleared.toString());
  }, [hasBeenCleared]);

  // Load persisted KOT data on mount
  useEffect(() => {
    const savedKOTData = localStorage.getItem('kotTabData');
    if (savedKOTData && !hasBeenCleared) {
      try {
        setKOTData(JSON.parse(savedKOTData));
      } catch (e) {
        console.warn('Failed to load saved KOT data:', e);
      }
    }
  }, [hasBeenCleared]);

  // Save KOT data whenever it changes (but not when clearing)
  useEffect(() => {
    if (kotData.length > 0 && !isClearing) {
      localStorage.setItem('kotTabData', JSON.stringify(kotData));
    }
  }, [kotData, isClearing]);

  // Component lifecycle logging for debugging
  useEffect(() => {
    console.log('🔄 KOTTab component MOUNTED');
    return () => {
      console.log('🔄 KOTTab component UNMOUNTED');
    };
  }, []);

  useEffect(() => {
    initializeKOTSystem();
  }, []); // Only initialize once on mount

  // Fixed useEffect to prevent infinite loops
  useEffect(() => {
    // CRITICAL: Prevent infinite loops
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

    // Get processed IDs from localStorage (source of truth)
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

    // Update localStorage FIRST (before state update)
    const updatedProcessedIds = Array.from(processedSet);
    localStorage.setItem('processedKOTOrderIds', JSON.stringify(updatedProcessedIds));
    console.log('💾 Saved processed IDs to localStorage:', updatedProcessedIds.length);

    // Update KOT data state
    setKOTData(prev => {
      const combined = [...prev, ...newKOTs];
      // Limit to last 100 KOTs to prevent memory issues
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

  }, [localOrders]); // Only depend on localOrders, not on processedOrderIds or kotData

  const initializeKOTSystem = async () => {
    try {
      setLoading(true);
      
      // Only convert orders if data hasn't been cleared
      if (!hasBeenCleared) {
        console.log('🔄 Initializing KOT system - converting orders (not cleared)');
        await convertOrdersToKOT();
      } else {
        console.log('⏸️ Initializing KOT system - skipping conversion (data was cleared)');
      }
      
      // Initialize kitchen stations
      await initializeStations();
      
      setIsInitialized(true);
      setLoading(false);
    } catch (error) {
      console.error('Error initializing KOT system:', error);
      setLoading(false);
      showToast('Error initializing KOT system');
    }
  };

  // Helper function to filter KOT data to only include recent orders (within 24 hours)
  const filterRecentKOTs = (kotDataList) => {
    return KOTHelpers.filterKOTsByTime(kotDataList, 24);
  };

  const convertOrdersToKOT = () => {
    console.log('🔄 convertOrdersToKOT called with localOrders:', localOrders?.length || 0, 'orders');

    if (!localOrders || localOrders.length === 0) {
      console.log('⚠️ No local orders to convert, setting empty KOT data');
      setKOTData([]);
      return;
    }

    // Load cleared order IDs from localStorage
    const clearedIds = JSON.parse(localStorage.getItem('kotTabClearedOrderIds') || '[]');
    
    // Filter orders from last 24 hours that are pending or confirmed
    const recentOrders = localOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      const now = new Date();
      const hoursDiff = (now - orderDate) / (1000 * 60 * 60);
      
      // Include orders from last 24 hours with pending/confirmed status
      const isRecent = hoursDiff <= 24;
      const isValidStatus = ['pending', 'confirmed', 'preparing'].includes(order.status);
      const notCleared = !clearedIds.includes(order._id);
      
      // IMPORTANT: Don't convert orders that are already completed or in Ready tab
      const notCompleted = order.status !== 'ready' && !order.kotCompleted;
      
      console.log('🔍 Order check:', {
        orderId: order._id,
        status: order.status,
        isRecent,
        isValidStatus,
        notCleared,
        notCompleted,
        willConvert: isRecent && isValidStatus && notCleared && notCompleted
      });
      
      return isRecent && isValidStatus && notCleared && notCompleted;
    });

    console.log('📋 Recent orders to convert:', recentOrders.length);

    if (recentOrders.length === 0) {
      console.log('⏸️ No recent orders (within 24 hours) to convert');
      return;
    }

    // Convert each order to KOT format
    const newKOTData = recentOrders.map(order => {
      const kotId = `KOT-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
      
      return {
        id: kotId,
        orderId: order._id, // IMPORTANT: Link back to original order
        status: KOT_STATUS.PENDING,
        items: order.items?.map(item => ({
          id: `${kotId}-${item.name.replace(/\s+/g, '-').toLowerCase()}`,
          name: item.name,
          quantity: item.quantity || item.qty || 1,
          unitPrice: item.price || 0,
          notes: item.notes || '',
          category: getItemCategory(item.name),
          preparationTime: getEstimatedPrepTime(item.name),
          actualPrepTime: null,
          startedAt: null,
          completedAt: order.status === 'completed' ? order.updatedAt : null,
          assignedTo: null,
          modifications: []
        })),
        totalAmount: order.total,
        createdAt: order.createdAt,
        confirmedAt: null,
        startedAt: null,
        completedAt: order.status === 'completed' ? order.updatedAt : null,
        estimatedTime: KOTHelpers.calculateEstimatedTime(
          order.items.map(item => ({ preparationTime: getEstimatedPrepTime(item.name) }))
        ),
        actualTime: null,
        notes: order.note || '',
        source: order.source || 'local',
        modifications: [],
        kitchenNotes: '',
        specialInstructions: ''
      };
    });

    // Add new KOTs to existing data
    setKOTData(prev => [...prev, ...newKOTData]);

    // Mark these orders as processed
    setProcessedOrderIds(prev => new Set([...prev, ...recentOrders.map(order => order._id)]));

    console.log('✅ Added', newKOTData.length, 'new KOTs, total KOTs now:', kotData.length + newKOTData.length);
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

  const mapKOTStatusToOrder = (kotStatus, kotItems = null) => {
    // For local orders to move to Ready tab, KOT must be fully completed
    // Don't move based on partial item readiness
    
    // Fallback to KOT-level status mapping
    switch (kotStatus) {
      case KOT_STATUS.PENDING: return 'pending';
      case KOT_STATUS.CONFIRMED: return 'confirmed';
      case KOT_STATUS.PREPARING: return 'preparing';
      case KOT_STATUS.READY: return 'preparing'; // Keep in preparing until fully completed
      case KOT_STATUS.COMPLETED: return 'ready'; // Only move to Ready tab when fully completed
      case KOT_STATUS.CANCELLED: return 'cancelled';
      default: return 'pending';
    }
  };

  const initializeStations = () => {
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

  const checkAndUpdateOrderReadiness = (updatedKOT) => {
    // Check if ALL items are ready/completed (not just some)
    const readyItems = updatedKOT.items.filter(item => 
      item.status === 'ready' || item.status === 'completed'
    );
    const totalItems = updatedKOT.items.length;
    
    // Only move to Ready tab if ALL items are ready/completed AND KOT status is completed
    if (readyItems.length === totalItems && totalItems > 0 && 
        (updatedKOT.status === 'completed' || updatedKOT.status === 'ready')) {
      
      // Try to find existing order by orderId first, then by KOT reference
      let existingOrder = localOrders.find(order => order._id === updatedKOT.orderId);
      if (!existingOrder) {
        existingOrder = localOrders.find(order => order.kotId === updatedKOT.id);
      }
      
      if (existingOrder) {
        const updatedOrder = {
          ...existingOrder,
          status: 'ready', // This ensures it appears in Ready tab
          updatedAt: new Date().toISOString(),
          readyItemsCount: readyItems.length,
          totalItemsCount: totalItems,
          // Add KOT metadata for tracking
          kotId: updatedKOT.id,
          kotStatus: updatedKOT.status,
          // Mark as fully completed from KOT
          kotCompleted: true,
        };
        
        // Update local state
        if (onLocalOrderUpdate) {
          onLocalOrderUpdate(updatedOrder);
        }
        
        // Show toast for full completion
        showToast(`All items completed for Order ${updatedKOT.orderId} - moved to Ready tab`);
      } else {
        // Create new local order for completed KOT
        const newLocalOrder = {
          _id: updatedKOT.orderId, // Always use the original order ID
          items: updatedKOT.items.map(item => ({
            name: item.name,
            price: item.unitPrice,
            qty: item.quantity
          })),
          note: updatedKOT.notes || `Order ${updatedKOT.orderId} completed`,
          status: 'ready', // Set to ready since KOT is completed
          total: updatedKOT.totalAmount,
          createdAt: updatedKOT.createdAt,
          source: 'local',
          updatedAt: new Date().toISOString(),
          kotId: updatedKOT.id,
          kotStatus: updatedKOT.status,
          readyItemsCount: readyItems.length,
          totalItemsCount: totalItems,
          kotCompleted: true,
        };
        
        // Add the new order to local state
        if (onLocalOrderUpdate) {
          onLocalOrderUpdate(newLocalOrder);
        }
        
        // Show toast for full completion
        showToast(`KOT Order ${updatedKOT.id} completed and added to Ready tab`);
      }
    } else if (readyItems.length > 0 && readyItems.length < totalItems) {
      // Show toast for partial readiness but don't move to Ready tab
      showToast(`${readyItems.length} of ${totalItems} items ready for Order ${updatedKOT.orderId} - waiting for completion`);
    }
  };

  const handleKOTUpdate = (updatedKOT) => {
    setKOTData(prev => prev.map(kot => 
      kot.id === updatedKOT.id ? updatedKOT : kot
    ));
    
    // Update selected KOT if it's the one being updated
    if (selectedKOT && selectedKOT.id === updatedKOT.id) {
      setSelectedKOT(updatedKOT);
    }

    // Check and update order readiness based on item status
    checkAndUpdateOrderReadiness(updatedKOT);

    // Sync back to local-orders.json (via localDataService)
    let existingOrder = localOrders.find(order => order._id === updatedKOT.orderId);
    
    // If no existing order found by orderId, try to find by KOT reference or create new one
    if (!existingOrder) {
      existingOrder = localOrders.find(order => order.kotId === updatedKOT.id);
    }
    
    if (existingOrder) {
      const updatedOrder = {
        ...existingOrder,
        status: mapKOTStatusToOrder(updatedKOT.status, updatedKOT.items),
        updatedAt: new Date().toISOString(),
        kitchenNotes: updatedKOT.kitchenNotes,
        // Add item-level readiness info for display in Ready tab
        readyItemsCount: updatedKOT.items.filter(item => 
          item.status === 'ready' || item.status === 'completed'
        ).length,
        totalItemsCount: updatedKOT.items.length,
        kotId: updatedKOT.id,
        kotStatus: updatedKOT.status,
      };
      
      // Assuming you have access to updateLocalOrder from localDataService
      if (typeof window !== 'undefined' && window.localDataService) {
        window.localDataService.updateLocalOrder(updatedOrder);
      }
      
      if (onLocalOrderUpdate) {
        onLocalOrderUpdate(updatedOrder);
      }
      
      // Show appropriate toast message
      if (updatedKOT.status === KOT_STATUS.COMPLETED) {
        showToast(`Order ${updatedKOT.orderId} is now ready and moved to Ready tab`);
      } else if (updatedKOT.status === KOT_STATUS.READY) {
        showToast(`Order ${updatedKOT.orderId} is ready and moved to Ready tab`);
      } else {
        showToast(`Order ${updatedKOT.orderId} status updated to ${updatedKOT.status}`);
      }
    } else {
      // Create a new local order if one doesn't exist and KOT is completed
      if (updatedKOT.status === KOT_STATUS.COMPLETED) {
        const newLocalOrder = {
          _id: updatedKOT.orderId, // Always use the original order ID
          items: updatedKOT.items.map(item => ({
            name: item.name,
            price: item.unitPrice,
            qty: item.quantity
          })),
          note: updatedKOT.notes || `Order ${updatedKOT.orderId} completed`,
          status: 'ready', // Set to ready since KOT is completed
          total: updatedKOT.totalAmount,
          createdAt: updatedKOT.createdAt,
          source: 'local',
          updatedAt: new Date().toISOString(),
          kotId: updatedKOT.id,
          kotStatus: updatedKOT.status,
          readyItemsCount: updatedKOT.items.filter(item => 
            item.status === 'ready' || item.status === 'completed'
          ).length,
          totalItemsCount: updatedKOT.items.length,
          kotCompleted: true,
        };
        
        // Add the new order to local state
        if (onLocalOrderUpdate) {
          onLocalOrderUpdate(newLocalOrder);
        }
        
        // Save to local storage
        if (typeof window !== 'undefined' && window.localDataService) {
          window.localDataService.updateLocalOrder(newLocalOrder);
        }
        
        showToast(`KOT Order ${updatedKOT.id} completed and added to Ready tab`);
      }
    }
  };

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

    // Update the original order
    const kot = kotData.find(k => k.id === kotId);
    
    console.log('🔍 KOT COMPLETION WORKFLOW DEBUG:', {
      kotId,
      kotFound: !!kot,
      kotDetails: kot ? {
        id: kot.id,
        orderId: kot.orderId,
        status: kot.status,
        itemsCount: kot.items?.length,
        isNewOrder: kot.orderId?.startsWith('local-') || kot.orderId?.startsWith('manual-')
      } : null,
      localOrdersCount: localOrders.length,
      localOrdersSample: localOrders.slice(0, 3).map(o => ({ id: o._id, status: o.status }))
    });
    
    // Try to find existing order by orderId first, then by KOT reference
    let existingOrder = localOrders.find(order => order._id === currentKOT?.orderId);
    if (!existingOrder && currentKOT) {
      existingOrder = localOrders.find(order => order.kotId === currentKOT.id);
    }
    
    console.log('🔍 ORDER SEARCH RESULTS:', {
      searchedForOrderId: currentKOT?.orderId,
      foundByOrderId: localOrders.find(order => order._id === currentKOT?.orderId),
      foundByKotId: currentKOT ? localOrders.find(order => order.kotId === currentKOT.id) : null,
      finalExistingOrder: existingOrder ? {
        id: existingOrder._id,
        status: existingOrder.status,
        kotCompleted: existingOrder.kotCompleted
      } : null,
      isNewManualOrder: currentKOT?.orderId?.startsWith('local-') || currentKOT?.orderId?.startsWith('manual-')
    });
    
    console.log('🔍 Existing order found:', !!existingOrder, existingOrder?._id);
    console.log('🔍 KOT Status check:', { kotId: currentKOT?.id, newStatus, kotCompleted: existingOrder?.kotCompleted });
    
    if (currentKOT && existingOrder && onLocalOrderUpdate) {
      // Only move to Ready tab if KOT is fully completed
      if (newStatus === KOT_STATUS.COMPLETED) {
        // Check if all items are ready/completed
        const readyItems = currentKOT?.items?.filter(item => 
        const readyItems = updatedKOT?.items?.filter(item => 
          item.status === 'ready' || item.status === 'completed'
        ) || [];
        const totalItems = updatedKOT?.items?.length || 0;
        
        if (readyItems.length === totalItems && totalItems > 0) {
          // All items are ready - move to Ready tab
          const updatedOrder = {
            ...existingOrder,
            status: 'ready', // Ensure status is 'ready' when KOT is completed
            updatedAt: new Date().toISOString(),
            readyItemsCount: readyItems.length,
            totalItemsCount: totalItems,
            kotId: updatedKOT.id,
            kotStatus: newStatus,
            kotCompleted: true,
          };
          
          console.log('✅ Updating existing order to Ready status:', {
            orderId: existingOrder._id,
            oldStatus: existingOrder.status,
            newStatus: updatedOrder.status,
            kotCompleted: updatedOrder.kotCompleted
          });
          
          onLocalOrderUpdate(updatedOrder);
          showToast(`Order ${kot.orderId} is now ready and moved to Ready tab`);
        } else {
          // Not all items ready - but KOT is still completed, so set kotCompleted: true
          const updatedOrder = {
            ...existingOrder,
            status: 'ready', // Still set to ready since KOT is completed
            updatedAt: new Date().toISOString(),
            readyItemsCount: readyItems.length,
            totalItemsCount: totalItems,
            kotId: updatedKOT.id,
            kotStatus: newStatus,
            kotCompleted: true, // Always set kotCompleted when KOT status is COMPLETED
          };
          
          console.log('✅ Updating existing order (partial completion) to Ready status:', {
            orderId: existingOrder._id,
            oldStatus: existingOrder.status,
            newStatus: updatedOrder.status,
            kotCompleted: updatedOrder.kotCompleted,
            readyItems: readyItems.length,
            totalItems: totalItems
          });
          
          onLocalOrderUpdate(updatedOrder);
          showToast(`Order ${kot.orderId} completed (${readyItems.length}/${totalItems} items ready) and moved to Ready tab`);
        }
      } else {
        // For other statuses, use the standard mapping
        const updatedOrder = {
          ...existingOrder,
          status: mapKOTStatusToOrder(newStatus),
          updatedAt: new Date().toISOString(),
          readyItemsCount: updatedKOT?.items?.filter(item => 
            item.status === 'ready' || item.status === 'completed'
          ).length || 0,
          totalItemsCount: updatedKOT?.items?.length || 0,
        };
        
        onLocalOrderUpdate(updatedOrder);
        showToast(`Order ${kot.orderId} status updated to ${newStatus}`);
      }
    } else if (kot && newStatus === KOT_STATUS.COMPLETED) {
      console.log('🆕 Creating new local order for KOT:', kot.id);
      
      // Create new local order if one doesn't exist and KOT is completed
      const newLocalOrder = {
        _id: kot.orderId || kot.id, // Use original order ID or KOT ID
        items: updatedKOT.items.map(item => ({
          name: item.name,
          price: item.unitPrice || item.price || 0,
          quantity: item.quantity || item.qty || 1,
          status: 'completed'
        })),
        note: updatedKOT.notes || `KOT ${kot.id} completed`,
        status: 'ready', // CRITICAL: Set to ready so it appears in Ready tab
        total: updatedKOT.totalAmount || updatedKOT.total || 0,
        createdAt: updatedKOT.createdAt || new Date().toISOString(),
        source: 'kot',
        updatedAt: new Date().toISOString(),
        kotId: updatedKOT.id,
        kotStatus: newStatus,
        readyItemsCount: updatedKOT?.items?.length || 0,
        totalItemsCount: updatedKOT?.items?.length || 0,
        kotCompleted: true, // CRITICAL: This flag ensures it appears in Ready tab
      };

      console.log('🆕 CREATING NEW LOCAL ORDER (no existing found):', {
        kotId: kot.id,
        orderId: kot.orderId,
        newOrderId: newLocalOrder._id,
        newOrderStatus: newLocalOrder.status,
        kotCompleted: newLocalOrder.kotCompleted,
        isNewManualOrder: kot.orderId?.startsWith('local-') || kot.orderId?.startsWith('manual-'),
        willCallOnLocalOrderUpdate: !!onLocalOrderUpdate,
        newOrderDetails: {
          status: newLocalOrder.status,
          source: newLocalOrder.source,
          kotCompleted: newLocalOrder.kotCompleted,
          kotId: newLocalOrder.kotId,
          itemsCount: newLocalOrder.items?.length
        }
      });

      // Add the new order to local state
      if (onLocalOrderUpdate) {
        console.log('📞 Calling onLocalOrderUpdate with new order...');
        onLocalOrderUpdate(newLocalOrder);
        showToast(`Order ${kot.orderId} completed and added to Ready tab`);
      } else {
        console.error('❌ onLocalOrderUpdate is not available!');
      }
      const updatedKOT = kotData.find(k => k.id === kotId);
      const readyItems = updatedKOT?.items?.filter(item => 
        item.status === 'ready' || item.status === 'completed'
      ) || [];
      const totalItems = updatedKOT?.items?.length || 0;
      
      console.log('🔍 KOT completion check:', {
        kotId: kot.id,
        newStatus,
        readyItemsCount: readyItems.length,
        totalItemsCount: totalItems,
        allItemsReady: readyItems.length === totalItems,
        willCreateOrder: readyItems.length === totalItems && totalItems > 0
      });
      
      if (readyItems.length === totalItems && totalItems > 0) {
        // All items are ready - create order with ready status
        const newLocalOrder = {
          _id: kot.orderId, // Always use the original order ID
          items: updatedKOT.items.map(item => ({
            name: item.name,
            price: item.unitPrice,
            qty: item.quantity
          })),
          note: updatedKOT.notes || `Order ${kot.orderId} completed`,
          status: 'ready', // Set to ready since KOT is completed
          total: updatedKOT.totalAmount,
          createdAt: updatedKOT.createdAt,
          source: 'local',
          updatedAt: new Date().toISOString(),
          kotId: updatedKOT.id,
          kotStatus: newStatus,
          readyItemsCount: readyItems.length,
          totalItemsCount: totalItems,
          kotCompleted: true,
        };

        console.log('🆕 CREATING NEW LOCAL ORDER (no existing found):', {
          kotId: kot.id,
          orderId: kot.orderId,
          newOrderId: newLocalOrder._id,
          newOrderStatus: newLocalOrder.status,
          kotCompleted: newLocalOrder.kotCompleted,
          isNewManualOrder: kot.orderId?.startsWith('local-') || kot.orderId?.startsWith('manual-'),
          willCallOnLocalOrderUpdate: !!onLocalOrderUpdate,
          newOrderDetails: {
            status: newLocalOrder.status,
            source: newLocalOrder.source,
            kotCompleted: newLocalOrder.kotCompleted,
            kotId: newLocalOrder.kotId,
            itemsCount: newLocalOrder.items?.length
          }
        });

        // Add the new order to local state
        if (onLocalOrderUpdate) {
          console.log('📞 Calling onLocalOrderUpdate with new order...');
          onLocalOrderUpdate(newLocalOrder);
          showToast(`Order ${kot.orderId} completed and added to Ready tab`);
        } else {
          console.error('❌ onLocalOrderUpdate is not available!');
        }
      } else {
        // KOT is completed but not all items are ready - still add to Ready tab since user explicitly completed it
        console.log('⚠️ KOT completed but not all items ready - adding to Ready tab anyway:', {
          kotId: kot.id,
          readyItems: readyItems.length,
          totalItems: totalItems
        });
        
        const newLocalOrder = {
          _id: kot.orderId, // Always use the original order ID
          items: updatedKOT.items.map(item => ({
            name: item.name,
            price: item.unitPrice,
            qty: item.quantity
          })),
          note: updatedKOT.notes || `Order ${kot.orderId} completed (partial completion)`,
          status: 'ready', // Still set to ready since KOT is completed
          total: updatedKOT.totalAmount,
          createdAt: updatedKOT.createdAt,
          source: 'local',
          updatedAt: new Date().toISOString(),
          kotId: updatedKOT.id,
          kotStatus: newStatus,
          readyItemsCount: readyItems.length,
          totalItemsCount: totalItems,
          kotCompleted: true,
        };
        
        // Add the new order to local state
        if (onLocalOrderUpdate) {
          onLocalOrderUpdate(newLocalOrder);
        }
        
        showToast(`KOT Order ${kot.id} completed and added to Ready tab (${readyItems.length}/${totalItems} items ready)`);
      }
    }
  };

  const handleStationUpdate = (stationId, updates) => {
    setStations(prev => prev.map(station => 
      station.id === stationId ? { ...station, ...updates } : station
    ));
  };

  const clearKOTData = () => {
    console.log('🧹 Clear KOT Data function called - COMPLETE DELETE');

    // 1. Clear all KOT-related localStorage data
    console.log('🗑️ Clearing all KOT localStorage data...');
    localStorage.removeItem('kotTabData');
    localStorage.removeItem('kotTabProcessedOrderIds');
    localStorage.removeItem('kotTabHasBeenCleared');
    localStorage.removeItem('kotTabClearedOrderIds');
    localStorage.removeItem('clearedOrderIds');
    localStorage.removeItem('kotTabData');
    localStorage.removeItem('kotStations');
    localStorage.removeItem('kotViewSettings');

    // 2. Clear all React state
    console.log('🔄 Resetting all React state...');
    setKOTData([]);
    setSelectedKOT(null);
    setActiveView('dashboard');
    setStations([]);
    setIsInitialized(false);
    setIsClearing(false);
    setHasBeenCleared(false);
    setProcessedOrderIds(new Set());

    // 3. Clear the actual KOT data array
    console.log('🗑️ Clearing KOT data array...');
    setKOTData([]);

    console.log('✅ All KOT data completely deleted');
    showToast('All KOT data permanently deleted');
  };

  const reloadKOTData = () => {
    console.log('🔄 Reload KOT Data function called');

    // Clear processed order IDs to allow reprocessing all orders
    console.log('🗑️ Clearing processedOrderIds for reload, current size:', processedOrderIds.size);
    setProcessedOrderIds(new Set());
    console.log('🗑️ Clearing processedOrderIds from localStorage for reload');
    localStorage.removeItem('kotTabProcessedOrderIds');

    // Reset the cleared flag to allow auto-conversion again
    console.log('🔄 Resetting hasBeenCleared to false for reload (was:', hasBeenCleared, ')');
    setHasBeenCleared(false);
    console.log('💾 Persisted hasBeenCleared=false to localStorage');

    // Re-initialize the system
    setIsInitialized(false);
    initializeKOTSystem();

    showToast('KOT data reloaded');
  };

  // Add cleanup function to remove old KOTs periodically
  const cleanupOldKOTs = () => {
    console.log('🧹 Cleaning up old KOTs (older than 24 hours)');
    const currentKOTDataLength = kotData.length;
    const recentKOTs = filterRecentKOTs(kotData);
    
    if (recentKOTs.length < currentKOTDataLength) {
      console.log('🗑️ Removing', currentKOTDataLength - recentKOTs.length, 'old KOTs');
      setKOTData(recentKOTs);
      showToast(`Removed ${currentKOTDataLength - recentKOTs.length} old orders (older than 24 hours)`);
    }
  };

  const removeSpecificOrder = (orderId) => {
    // Remove specific order from KOT data
    setKOTData(prev => prev.filter(kot => kot.orderId !== orderId));
    
    // Clear selected KOT if it was the removed order
    if (selectedKOT && selectedKOT.orderId === orderId) {
      setSelectedKOT(null);
      setActiveView('dashboard');
    }
    
    showToast(`Order ${orderId} removed from KOT`);
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

  // Cleanup old KOTs every 5 minutes
  useEffect(() => {
    if (!isInitialized || kotData.length === 0) return;
    
    const cleanupInterval = setInterval(() => {
      cleanupOldKOTs();
    }, 5 * 60 * 1000); // 5 minutes
    
    // Run cleanup immediately on component mount after initialization
    const cleanupTimeout = setTimeout(() => {
      cleanupOldKOTs();
    }, 1000); // 1 second after initialization
    
    return () => {
      clearInterval(cleanupInterval);
      clearTimeout(cleanupTimeout);
    };
  }, [isInitialized, kotData.length]);

  const handleRefresh = () => {
    // Clear KOT data and reload fresh data from localOrders
    clearKOTData();
    convertOrdersToKOT();
    showToast('KOT data refreshed');
  };

  const renderNavigation = () => (
    <div className="bg-white border-b border-gray-200 mb-4">
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
            kotData={filterRecentKOTs(kotData)}
            onKOTSelect={handleKOTSelect}
            onClearKOT={clearKOTData}
            onReloadKOT={reloadKOTData}
          />
        );
      
      case 'queue':
        return (
          <KOTQueue
            kotData={filterRecentKOTs(kotData)}
            onKOTSelect={handleKOTSelect}
            onStatusUpdate={handleStatusUpdate}
          />
        );
      
      case 'stations':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {stations.map((station) => (
              <KOTStation
                key={station.id}
                station={station}
                kotData={filterRecentKOTs(kotData)}
                onStationUpdate={handleStationUpdate}
              />
            ))}
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
    <div className="w-full">
      {renderNavigation()}
      {renderContent()}
    </div>
  );
};

export default KOTTab;
