import React, { useState, useEffect } from 'react';
import { Clock, Users, ChefHat, AlertCircle, CheckCircle, Timer, TrendingUp } from 'lucide-react';
import { KOT_STATUS, PRIORITY, KOTHelpers } from '../../models/kotModel';
import KOTProgressBar from './KOTProgressBar';

const KOTDashboard = ({ kotData, onKOTSelect, onRefresh, onRefreshKOT, onReloadKOT }) => {
  // Debug: Log incoming KOT data
  console.log('🍳 KOTDashboard - Received kotData:', {
    totalKOTs: kotData?.length || 0,
    kotData: kotData?.map(kot => ({
      id: kot.id,
      status: kot.status,
      itemCount: kot.items?.length || 0,
      itemStatuses: kot.items?.map(i => ({ name: i.name, status: i.status }))
    }))
  });

  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    preparingOrders: 0,
    readyOrders: 0,
    completedOrders: 0,
    readyItems: 0,
    pendingItems: 0,
    preparingItems: 0,
    averagePrepTime: 0
  });

  const [activeKOTs, setActiveKOTs] = useState([]);

  // Helper function to check if an order is recent (within 30 minutes)
  const isRecentOrder = (kot) => {
    if (!kot.completedAt && !kot.updatedAt) return false;

    const completionTime = kot.completedAt || kot.updatedAt;
    const now = new Date();
    const completionDate = new Date(completionTime);
    const timeDiff = now - completionDate;
    const minutesDiff = timeDiff / (1000 * 60);

    return minutesDiff <= 30; // Show completed/ready orders for 30 minutes
  };

  // Helper function to check if an order has recently completed items
  const hasRecentCompletedItems = (kot) => {
    if (!Array.isArray(kot.items)) return false;

    const recentItems = kot.items.filter(item => {
      if (!item.completedAt) return false;

      const now = new Date();
      const completedAt = new Date(item.completedAt);
      const timeDiff = now - completedAt;
      const minutesDiff = timeDiff / (1000 * 60);

      return minutesDiff <= 30; // Show orders with recently completed items for 30 minutes
    });

    return recentItems.length > 0;
  };

  useEffect(() => {
    if (kotData && kotData.length > 0) {
      calculateStats();
      const filteredKOTs = kotData.filter(kot => {
        // Include active orders (not completed/cancelled)
        if (kot.status !== KOT_STATUS.COMPLETED && kot.status !== KOT_STATUS.CANCELLED) {
          return true;
        }

        // Include recent completed/ready orders (within 30 minutes)
        if ((kot.status === KOT_STATUS.COMPLETED || kot.status === KOT_STATUS.READY) && isRecentOrder(kot)) {
          return true;
        }

        // Include orders with recently completed individual items (within 30 minutes)
        if (hasRecentCompletedItems(kot)) {
          return true;
        }

        return false;
      });

      console.log('🍳 KOTDashboard - Active KOT filtering:', {
        totalKOTs: kotData.length,
        activeKOTs: filteredKOTs.length,
        filteredKOTs: filteredKOTs.map(kot => ({
          id: kot.id,
          status: kot.status,
          itemCount: kot.items?.length || 0,
          preparingItems: kot.items?.filter(i => i.status === 'preparing').length || 0,
          readyItems: kot.items?.filter(i => i.status === 'ready' || i.status === 'completed').length || 0
        }))
      });

      setActiveKOTs(filteredKOTs);
    }
  }, [kotData]);

  const calculateStats = () => {
    const stats = kotData.reduce((acc, kot) => {
      acc.totalOrders++;

      // Count individual pending items
      const pendingItemsCount = kot.items.filter(item =>
        item.status === 'pending'
      ).length;
      acc.pendingItems += pendingItemsCount;

      // Count individual preparing items
      const preparingItemsCount = kot.items.filter(item =>
        item.status === 'preparing'
      ).length;
      acc.preparingItems += preparingItemsCount;

      // Count individual ready items (including items within orders of any status)
      const readyItemsCount = kot.items.filter(item =>
        item.status === 'ready' || item.status === 'completed'
      ).length;
      acc.readyItems += readyItemsCount;

      // 🔥 CRITICAL FIX: Count orders in mutually exclusive categories
      // Priority order: completed > ready > preparing > pending

      // Define helper variables
      const allItemsReady = kot.items.length > 0 && kot.items.every(item =>
        item.status === 'ready' || item.status === 'completed'
      );
      const hasPreparingItems = kot.items.some(item => item.status === 'preparing');

      // Count completed orders (when ALL items are completed/cancelled)
      const allItemsCompleted = kot.items.length > 0 && kot.items.every(item =>
        item.status === 'completed' || item.status === 'cancelled'
      );
      if (allItemsCompleted) {
        acc.completedOrders++;
      }
      // Count ready orders (when ALL items are ready/completed but not all completed)
      else if (allItemsReady) {
        acc.readyOrders++;
      }
      // Count preparing orders (when any items are preparing)
      else if (hasPreparingItems) {
        acc.preparingOrders++;
      }
      // Count pending orders (everything else - orders with pending items but no preparing items)
      else {
        acc.pendingOrders++;
      }

      console.log(`📊 Order ${kot.id} categorized as:`, {
        allItemsCompleted,
        allItemsReady,
        hasPreparingItems,
        category: allItemsCompleted ? 'completed' : allItemsReady ? 'ready' : hasPreparingItems ? 'preparing' : 'pending',
        itemStatuses: kot.items.map(i => ({ name: i.name, status: i.status }))
      });

      if (kot.actualTime) {
        acc.totalPrepTime += kot.actualTime;
        acc.completedWithTime++;
      }

      return acc;
    }, {
      totalOrders: 0,
      pendingOrders: 0,
      preparingOrders: 0,
      readyOrders: 0,
      completedOrders: 0,
      readyItems: 0,
      pendingItems: 0,
      preparingItems: 0,
      totalPrepTime: 0,
      completedWithTime: 0
    });

    stats.averagePrepTime = stats.completedWithTime > 0
      ? Math.round(stats.totalPrepTime / stats.completedWithTime)
      : 0;

    console.log('📊 KOT Dashboard Stats:', {
      totalOrders: stats.totalOrders,
      pendingOrders: stats.pendingOrders,
      preparingOrders: stats.preparingOrders,
      readyOrders: stats.readyOrders,
      readyItems: stats.readyItems
    });

    setStats(stats);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case KOT_STATUS.PENDING: return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case KOT_STATUS.PREPARING: return 'bg-blue-100 text-blue-800 border-blue-300';
      case KOT_STATUS.READY: return 'bg-green-100 text-green-800 border-green-300';
      case KOT_STATUS.COMPLETED: return 'bg-gray-100 text-gray-800 border-gray-300';
      case KOT_STATUS.CANCELLED: return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case PRIORITY.URGENT: return 'bg-red-500 text-white';
      case PRIORITY.HIGH: return 'bg-orange-500 text-white';
      case PRIORITY.NORMAL: return 'bg-blue-500 text-white';
      case PRIORITY.LOW: return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getElapsedTime = (dateString) => {
    if (!dateString) return '—';
    const now = new Date();
    const created = new Date(dateString);
    const diff = now - created;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  const getPreparationTime = (startedAt) => {
    if (!startedAt) return '—';
    const now = new Date();
    const started = new Date(startedAt);
    const diff = now - started;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleQuickConfirmOrder = (kot) => {
    if (!kot) return;

    // Create updated KOT with all items marked as ready
    const updatedKOT = {
      ...kot,
      status: KOT_STATUS.READY,
      items: kot.items.map(item => ({
        ...item,
        status: 'ready',
        completedAt: new Date().toISOString()
      }))
    };

    // Show success message
    if (typeof window !== 'undefined' && window.showToast) {
      const displayId = (() => {
        // Try to get a string ID from multiple possible sources
        if (typeof kot.orderId === 'string') return kot.orderId;
        if (typeof kot._id === 'string') return kot._id;
        if (typeof kot.id === 'string') return kot.id;

        // Handle object cases
        if (kot.orderId && typeof kot.orderId === 'object') return String(kot.orderId._id || kot.orderId.id || 'UNKNOWN');
        if (kot._id && typeof kot._id === 'object') return String(kot._id._id || kot._id.id || 'UNKNOWN');
        if (kot.id && typeof kot.id === 'object') return String(kot.id._id || kot.id.id || 'UNKNOWN');

        return String(kot.id ?? kot._id ?? kot.orderId ?? 'UNKNOWN');
      })();

      window.showToast(`Order ${displayId} confirmed - all items marked as ready`);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Orders</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.pendingItems} items</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Preparing</p>
              <p className="text-2xl font-bold text-gray-900">{stats.preparingOrders}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.preparingItems} items</p>
            </div>
            <ChefHat className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ready Orders</p>
              <p className="text-2xl font-bold text-gray-900">{stats.readyOrders}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.readyItems} items</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Prep Time</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averagePrepTime}m</p>
            </div>
            <Timer className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Active KOTs List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Active & Recent Orders</h2>
              <p className="text-sm text-gray-600 mt-1">Shows active orders and recently completed orders (last 30 minutes)</p>
            </div>
            <button
              onClick={onRefreshKOT}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh View
            </button>
          </div>
        </div>

        {activeKOTs.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No active orders at the moment</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {activeKOTs.map((kot, index) => (
              <div
                key={`${kot.source}-${kot.id}-${kot.createdAt || index}`}
                onClick={() => {
                  console.log('🔄 KOTDashboard - Selecting KOT:', kot.id);
                  onKOTSelect && onKOTSelect(kot);
                }}
                className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {String(kot.id ?? 'UNKNOWN')}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(kot.status)}`}>
                        {String(kot.status || 'pending').toUpperCase()}
                      </span>
                      {kot.status === KOT_STATUS.COMPLETED && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium border border-green-300">
                          ✓ RECENTLY COMPLETED
                        </span>
                      )}
                      {kot.status !== KOT_STATUS.COMPLETED && hasRecentCompletedItems(kot) && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium border border-blue-300">
                          ✓ ITEMS COMPLETED
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(kot.priority)}`}>
                        {String(kot.priority || 'normal').toUpperCase()}
                      </span>
                      {kot.tableNumber && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                          Table {kot.tableNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <span>{Array.isArray(kot.items) ? kot.items.length : 0} items</span>
                      <span>₹{Number(kot.total || 0)}</span>
                      <span>{formatTime(kot.createdAt)}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {getElapsedTime(kot.createdAt)}
                      </span>
                    </div>

                    {kot.notes && (
                      <p className="mt-2 text-sm text-gray-600 italic">
                        Note: {kot.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <KOTProgressBar items={kot.items} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default KOTDashboard;
