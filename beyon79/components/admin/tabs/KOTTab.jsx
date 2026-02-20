import React, { useState, useEffect, useCallback } from 'react';
import KOTDashboard from '../../kot/KOTDashboard';
import KOTOrders from '../../kot/KOTOrders';
import KOTDetail from '../../kot/KOTDetail';
import KOTQueue from '../../kot/KOTQueue';
import KOTStation from '../../kot/KOTStation';
import { KOT_STATUS } from '../../../models/kotModel';

/**
 * KOTTab Component - PURE UI ONLY
 * =================================
 * 
 * PURPOSE:
 * Pure UI component that receives pre-processed KOT orders.
 * 
 * ARCHITECTURE:
 * - ❌ Does NOT fetch orders itself
 * - ❌ Does NOT convert orders
 * - ❌ Does NOT filter orders
 * - ✅ Receives kotOrders as prop (already processed)
 * - ✅ Pure UI rendering only
 * 
 * DATA FLOW:
 * useUnifiedOrderData → useFilteredOrders(KOT) → KOTTab (PURE UI)
 */
const KOTTab = ({ kotOrders, onLocalOrderUpdate, showToast }) => {
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedKOT, setSelectedKOT] = useState(null);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initialize loading state
  useEffect(() => {
    setLoading(false);
  }, []);

  // Keep selectedKOT in sync with kotOrders (latest from store)
  useEffect(() => {
    if (selectedKOT && kotOrders) {
      const freshKOT = kotOrders.find(k => k.id === selectedKOT.id);
      if (freshKOT && freshKOT !== selectedKOT) {
        setSelectedKOT(freshKOT);
      }
    }
  }, [kotOrders]);


  // Handle status updates
  const handleStatusUpdate = useCallback((kotId, newStatus, fullKOTUpdate = null) => {
    console.log('🔄 KOTTab handleStatusUpdate:', { kotId, newStatus });

    // Extract string ID from kotId object if needed
    const stringKotId = typeof kotId === 'string' ? kotId :
      (typeof kotId === 'object' && kotId.id) ? kotId.id :
        (typeof kotId === 'object' && kotId._id) ? kotId._id :
          (typeof kotId === 'object' && kotId.orderId) ? kotId.orderId :
            String(kotId || '');

    if (onLocalOrderUpdate) {
      // ✅ FIX: STRICT SYNC for KOT Completion
      const updates = { _id: stringKotId };

      if (newStatus === KOT_STATUS.COMPLETED) {
        updates.status = 'ready'; // Force main order to ready
        updates.kotCompleted = true; // Set flag
        updates.readyAt = new Date().toISOString();
      } else {
        const statusMap = {
          [KOT_STATUS.PENDING]: 'pending',
          [KOT_STATUS.CONFIRMED]: 'confirmed',
          [KOT_STATUS.PREPARING]: 'preparing',
          [KOT_STATUS.READY]: 'completed', // Internal KOT ready -> Order completed (or stay preparing?) - let's keep mappings simple
          [KOT_STATUS.CANCELLED]: 'cancelled'
        };
        updates.status = statusMap[newStatus] || 'pending';
        updates.kotCompleted = false;
      }

      onLocalOrderUpdate(updates);
    }

    if (showToast) {
      showToast(`KOT ${stringKotId} status updated to ${newStatus}`);
    }
  }, [onLocalOrderUpdate, showToast]);

  // Full KOT persistence handler
  const handleKOTUpdate = useCallback((updatedKOT) => {
    console.log('✅ Persisting full KOT:', updatedKOT.id, updatedKOT.status);

    // 2️⃣ UPDATE UI STATE
    setSelectedKOT(updatedKOT);

    // ❌ REMOVED: localStorage 'kotTabData' persistence.
    // We now sync directly to the main Order system via onLocalOrderUpdate below.

    // 3️⃣ Sync to order system - SEND COMPLETE DATA!
    // ✅ FIX: Robust ID selection
    const orderId = updatedKOT._id || updatedKOT.id;

    onLocalOrderUpdate?.({
      _id: orderId,
      status: updatedKOT.status,
      kotCompleted: updatedKOT.status === KOT_STATUS.COMPLETED,
      // 🔥 CRITICAL: Send complete items array with all updates
      items: updatedKOT.items,
      // 🔥 CRITICAL: Send timestamps for timer persistence
      startedAt: updatedKOT.startedAt,
      completedAt: updatedKOT.completedAt,
      confirmedAt: updatedKOT.confirmedAt,
      // 🔥 CRITICAL: Send other KOT data
      totalAmount: updatedKOT.total,
      customerName: updatedKOT.customerName,
      tableNumber: updatedKOT.tableNumber,
      orderType: updatedKOT.orderType,
      priority: updatedKOT.priority,
      notes: updatedKOT.notes,
      kitchenNotes: updatedKOT.kitchenNotes,
      createdAt: updatedKOT.createdAt,
      source: updatedKOT.source || 'local'
    });
  }, [onLocalOrderUpdate]);

  // Simple clear function
  const clearKOTData = () => {
    setSelectedKOT(null);
    setActiveView('dashboard');
    showToast?.('KOT view cleared');
  };

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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kitchen Order Tickets</h1>
            <p className="text-sm text-gray-600 mt-1">Manage kitchen operations and order flow</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              {kotOrders.length} Active KOTs
            </span>
            <button
              onClick={clearKOTData}
              disabled={kotOrders.length === 0}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeView === 'dashboard'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setActiveView('orders')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeView === 'orders'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
          >
            📋 Orders
          </button>
          <button
            onClick={() => setActiveView('queue')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeView === 'queue'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
          >
            ⏳ Queue
          </button>
          <button
            onClick={() => setActiveView('station')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeView === 'station'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
          >
            👨‍🍳 Station
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeView === 'dashboard' && (
          <KOTDashboard
            kotData={kotOrders}
            onKOTSelect={(kot) => {
              setSelectedKOT(kot);
              setActiveView('detail');
            }}
            onStatusUpdate={handleStatusUpdate}
            onRefreshKOT={clearKOTData}
            onReloadKOT={clearKOTData}
            onDeletePending={clearKOTData}
          />
        )}
        {activeView === 'orders' && (
          <KOTOrders
            kotData={kotOrders}
            onKOTSelect={(kot) => {
              setSelectedKOT(kot);
              setActiveView('detail');
            }}
            onStatusUpdate={handleStatusUpdate}
          />
        )}
        {activeView === 'station' && (
          <KOTStation
            kotData={kotOrders}
            stations={stations}
            onStatusUpdate={handleStatusUpdate}
            onStationUpdate={setStations}
          />
        )}
        {activeView === 'queue' && (
          <KOTQueue
            kotData={kotOrders}
            onKOTSelect={setSelectedKOT}
            onStatusUpdate={handleStatusUpdate}
          />
        )}
        {activeView === 'detail' && selectedKOT && (
          <KOTDetail
            kot={selectedKOT}
            onUpdate={handleKOTUpdate}
            onClose={() => setSelectedKOT(null)}
          />
        )}
      </div>
    </div>
  );
};

export default KOTTab;