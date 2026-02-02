import React, { useState, useEffect } from 'react';
import { Clock, ChefHat, CheckCircle, AlertCircle, Play, Pause, X, Edit2, Save, User, Timer } from 'lucide-react';
import { KOT_STATUS, ITEM_STATUS, PRIORITY, KOTHelpers } from '../../models/kotModel';

const KOTDetail = ({ kot, onUpdate, onClose }) => {
  const [editingNotes, setEditingNotes] = useState(false);
  const [kitchenNotes, setKitchenNotes] = useState(kot?.kitchenNotes || '');
  const [itemTimers, setItemTimers] = useState({});

  const kotStatus = kot?.status;




  useEffect(() => {
    const interval = setInterval(() => {
      setItemTimers(prev => {
        const updated = { ...prev };
        kot?.items.forEach((item, index) => {
          const itemId = item.id || `${kot.id}-item-${index}`;
          if (item.status === ITEM_STATUS.PREPARING && item.startedAt) {
            updated[itemId] = Date.now() - new Date(item.startedAt).getTime();
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [kot.id, kot.items]);





  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getItemStatusColor = (status) => {
    switch (status) {
      case ITEM_STATUS.PENDING: return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case ITEM_STATUS.PREPARING: return 'bg-blue-100 text-blue-800 border-blue-300';
      case ITEM_STATUS.READY: return 'bg-green-100 text-green-800 border-green-300';
      case ITEM_STATUS.COMPLETED: return 'bg-gray-100 text-gray-800 border-gray-300';
      case ITEM_STATUS.CANCELLED: return 'bg-red-100 text-red-800 border-red-300';
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

  const updateItemStatus = (itemId, newStatus) => {
    console.log(`🔄 Updating item ${itemId} to ${newStatus}`);

    const updatedItems = kot.items.map((item, index) => {
      const currentItemId = item.id || `${kot.id}-item-${index}`;

      if (currentItemId === itemId) {
        // Guard against re-trigger loops
        if (item.status === newStatus) return item;

        console.log(`✅ Found item to update: ${item.name} (${currentItemId})`);

        const updatedItem = {
          ...item,
          id: currentItemId, // Ensure item has an ID
          status: newStatus
        };

        if (newStatus === ITEM_STATUS.PREPARING && !item.startedAt) {
          updatedItem.startedAt = new Date().toISOString();
          console.log(`⏰ Started preparation for ${item.name} at ${updatedItem.startedAt}`);
        } else if (newStatus === ITEM_STATUS.COMPLETED && item.startedAt) {
          updatedItem.completedAt = new Date().toISOString();
          updatedItem.actualPrepTime = Math.floor(
            (new Date(updatedItem.completedAt) - new Date(item.startedAt)) / 1000 / 60
          );
          console.log(`✅ Completed ${item.name} in ${updatedItem.actualPrepTime} minutes`);
        }

        return updatedItem;
      }
      return item;
    });

    const updatedKOT = {
      ...kot,
      items: updatedItems
    };

    // 🔥 CRITICAL FIX: Update KOT status based on item statuses
    const hasPreparingItems = updatedItems.some(item => item.status === ITEM_STATUS.PREPARING);
    const hasReadyItems = updatedItems.some(item => item.status === ITEM_STATUS.READY);
    const hasCompletedItems = updatedItems.some(item => item.status === ITEM_STATUS.COMPLETED);
    const hasPendingItems = updatedItems.some(item => item.status === ITEM_STATUS.PENDING);
    const hasCancelledItems = updatedItems.some(item => item.status === ITEM_STATUS.CANCELLED);
    
    // Count active (non-cancelled) items for completion logic
    const activeItems = updatedItems.filter(item => item.status !== ITEM_STATUS.CANCELLED);
    const allCompleted = activeItems.length > 0 && activeItems.every(item => 
      item.status === ITEM_STATUS.COMPLETED
    );
    const allReady = activeItems.length > 0 && activeItems.every(item => 
      item.status === ITEM_STATUS.READY || item.status === ITEM_STATUS.COMPLETED
    );

    console.log('🔍 KOT Status Logic:', {
      hasPreparingItems,
      hasReadyItems,
      hasCompletedItems,
      hasPendingItems,
      hasCancelledItems,
      allCompleted,
      allReady,
      currentStatus: kot.status,
      totalItems: updatedItems.length,
      activeItems: activeItems.length,
      cancelledItems: updatedItems.length - activeItems.length,
      itemStatuses: updatedItems.map(i => ({ name: i.name, status: i.status }))
    });

    // Only change to COMPLETED when ALL ACTIVE items are completed
    if (allCompleted && kot.status !== KOT_STATUS.COMPLETED) {
      updatedKOT.status = KOT_STATUS.COMPLETED;
      updatedKOT.completedAt = new Date().toISOString();
      console.log('🔥 KOT status changed to COMPLETED - all active items done');
    }
    // Change to READY when ALL ACTIVE items are ready/completed (but not all completed)
    else if (allReady && !allCompleted && kot.status !== KOT_STATUS.READY) {
      updatedKOT.status = KOT_STATUS.READY;
      console.log('🔥 KOT status changed to READY - all active items ready');
    }
    // Change to PREPARING if any active items are preparing (higher priority than ready)
    else if (hasPreparingItems && kot.status !== KOT_STATUS.PREPARING) {
      updatedKOT.status = KOT_STATUS.PREPARING;
      updatedKOT.startedAt = updatedKOT.startedAt || new Date().toISOString();
      console.log('🔥 KOT status changed to PREPARING due to item preparation');
    }
    // Keep as PENDING if there are still pending active items and no preparing/ready items
    else if (hasPendingItems && !hasPreparingItems && !hasReadyItems && kot.status !== KOT_STATUS.PENDING) {
      updatedKOT.status = KOT_STATUS.PENDING;
      console.log('🔥 KOT status kept as PENDING - still has pending items');
    }
    // If all items are cancelled, mark as cancelled
    else if (hasCancelledItems && activeItems.length === 0 && kot.status !== KOT_STATUS.CANCELLED) {
      updatedKOT.status = KOT_STATUS.CANCELLED;
      console.log('🔥 KOT status changed to CANCELLED - all items cancelled');
    }

    console.log('�� Calling onUpdate with updated KOT:', updatedKOT);
    onUpdate(updatedKOT);
  };

  const handleBulkCompleteOrder = () => {
    // Update all items to COMPLETED status
    const updatedItems = kot.items.map(item => {
      const now = new Date().toISOString();
      return {
        ...item,
        status: ITEM_STATUS.COMPLETED,
        startedAt: item.startedAt || now, // Set start time if not already set
        completedAt: now,
        actualPrepTime: item.actualPrepTime || Math.floor(
          (new Date(now) - new Date(item.startedAt || now)) / 1000 / 60
        )
      };
    });

    // Update the entire KOT to COMPLETED status
    onUpdate({
      ...kot,
      status: KOT_STATUS.COMPLETED,
      items: updatedItems,
      completedAt: new Date().toISOString()
    });

    // Show success message
    if (typeof window !== 'undefined' && window.showToast) {
      window.showToast(`Order ${String(kot.id || 'UNKNOWN')} bulk completed - all items marked as finished`);
    }
  };

  const handleBulkStartPreparation = () => {
    // Guard against re-trigger loops
    if (kotStatus === KOT_STATUS.PREPARING) return;

    const now = new Date().toISOString();

    const updatedItems = kot.items.map((item, index) => ({
      ...item,
      id: item.id || `${kot.id}-item-${index}`,
      status: ITEM_STATUS.PREPARING,   // 🔥 REQUIRED
      startedAt: item.startedAt || now
    }));

    const updatedKOT = {
      ...kot,
      status: KOT_STATUS.PREPARING,
      startedAt: now,
      items: updatedItems
    };

    console.log('🔥 PREPARING STARTED');

    onUpdate(updatedKOT);
  };

  const handleBulkMarkReady = () => {
    // Update all items to READY status
    const updatedItems = kot.items.map(item => ({
      ...item,
      status: ITEM_STATUS.READY
    }));

    onUpdate({
      ...kot,
      status: KOT_STATUS.READY,
      items: updatedItems
    });

    if (typeof window !== 'undefined' && window.showToast) {
      window.showToast(`Order ${String(kot.id || 'UNKNOWN')} - all items marked as ready`);
    }
  };

  const updateKOTStatus = (newStatus) => {
    console.log('🔄 KOTDetail updateKOTStatus called:', {
      kotId: kot.id,
      newStatus,
      currentStatus: kot.status
    });

    const updatedKOT = { ...kot, status: newStatus };

    // Add timestamps based on status
    if (newStatus === KOT_STATUS.CONFIRMED && !kot.confirmedAt) {
      updatedKOT.confirmedAt = new Date().toISOString();
      console.log('✅ CONFIRMED:', updatedKOT.status);
      // Keep items as PENDING when KOT is confirmed
      updatedKOT.items = kot.items.map(item => ({
        ...item,
        status: ITEM_STATUS.PENDING
      }));
    } else if (newStatus === KOT_STATUS.COMPLETED && kot.startedAt) {
      updatedKOT.completedAt = new Date().toISOString();
      updatedKOT.actualTime = Math.floor(
        (new Date(updatedKOT.completedAt) - new Date(kot.startedAt)) / 1000 / 60
      );
      console.log('✅ KOT completed in', updatedKOT.actualTime, 'minutes');
      // Update all items to COMPLETED status
      updatedKOT.items = kot.items.map(item => ({
        ...item,
        status: ITEM_STATUS.COMPLETED,
        completedAt: new Date().toISOString()
      }));
    }

    console.log('🔄 Calling onUpdate with KOT:', {
      id: updatedKOT.id,
      status: updatedKOT.status,
      itemCount: updatedKOT.items.length
    });

    onUpdate(updatedKOT);
  };

  const saveKitchenNotes = () => {
    onUpdate({ ...kot, kitchenNotes });
    setEditingNotes(false);
  };

  const handleCancelOrder = () => {
    // Cancel all items in the order
    const updatedItems = kot.items.map(item => ({
      ...item,
      status: ITEM_STATUS.CANCELLED
    }));

    // Update the entire KOT to CANCELLED status
    onUpdate({
      ...kot,
      status: KOT_STATUS.CANCELLED,
      items: updatedItems,
      cancelledAt: new Date().toISOString()
    });

    // Show success message
    if (typeof window !== 'undefined' && window.showToast) {
      window.showToast(`Order ${String(kot.id || 'UNKNOWN')} has been cancelled`);
    }

    // Close the detail view after cancelling
    onClose();
  };

  useEffect(() => {
    console.log('� UI STATUS CHANGED:', {
      kotId: kot?.id,
      kotStatus: kotStatus,
      shouldShowConfirmAll: kotStatus === KOT_STATUS.PENDING,
      shouldShowStartPrep: kotStatus === KOT_STATUS.CONFIRMED,
      shouldShowMarkReady: kotStatus === KOT_STATUS.PREPARING,
      shouldShowCompleteAll: kotStatus === KOT_STATUS.READY
    });
  }, [kotStatus]);

  if (!kot) return <div>KOT not found</div>;

  return (
    <div className="bg-white h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-900">{String(kot.id ?? 'UNKNOWN')}</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getItemStatusColor(kotStatus)}`}>
            {String(kotStatus || 'pending').toUpperCase()}
          </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(kot.priority)}`}>
              {String(kot.priority || 'normal').toUpperCase()}
            </span>
            {kot.tableNumber && (
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                Table {kot.tableNumber}
              </span>
            )}
          </div>
          <button
            onClick={handleCancelOrder}
            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
            title="Cancel Order"
          >
            <X className="w-5 h-5 text-red-500" />
          </button>
        </div>

        <div className="flex items-center gap-6 mt-3 text-sm text-gray-600">
          <span>{kot.orderType}</span>
          <span>{kot.items.length} items</span>
          <span>₹{kot.totalAmount}</span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {new Date(kot.createdAt).toLocaleTimeString()}
          </span>
          {kot.estimatedTime && (
            <span className="flex items-center gap-1">
              <Timer className="w-4 h-4" />
              Est. {kot.estimatedTime}m
            </span>
          )}
        </div>
      </div>

      {/* Kitchen Notes Section */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Kitchen Notes</h3>
          {!editingNotes && (
            <button
              onClick={() => setEditingNotes(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
        
        {editingNotes ? (
          <div className="mt-2">
            <textarea
              value={kitchenNotes}
              onChange={(e) => setKitchenNotes(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Add kitchen notes..."
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={saveKitchenNotes}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={() => {
                  setEditingNotes(false);
                  setKitchenNotes(kot.kitchenNotes || '');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-gray-600">
            {kitchenNotes || 'No kitchen notes added yet'}
          </p>
        )}
      </div>

      {/* Order Actions */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex gap-2 flex-wrap">
          {kotStatus === KOT_STATUS.PENDING && (
            <button
              onClick={() => updateKOTStatus(KOT_STATUS.CONFIRMED)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Confirm All
            </button>
          )}
          {kotStatus === KOT_STATUS.CONFIRMED && (
            <button
              onClick={handleBulkStartPreparation}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start Preparation
            </button>
          )}
          {kotStatus === KOT_STATUS.PREPARING && (
            <button
              onClick={handleBulkMarkReady}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Mark Ready
            </button>
          )}
          {kotStatus === KOT_STATUS.READY && (
            <button
              onClick={handleBulkCompleteOrder}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Complete All
            </button>
          )}
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-auto">
        <div className="px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
          <div className="space-y-3">
            {kot.items.map((item, index) => {
              // Ensure each item has a unique ID
              const itemId = item.id || `${kot.id}-item-${index}`;
              
              return (
                <div key={itemId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                          Qty: {item.quantity}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getItemStatusColor(item.status)}`}>
                          {String(item.status || 'pending').toUpperCase()}
                        </span>
                        {item.category && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            {item.category}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>₹{item.unitPrice} each</span>
                        <span>₹{item.unitPrice * item.quantity} total</span>
                        {item.preparationTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Est. {item.preparationTime}m
                          </span>
                        )}
                      </div>

                      {item.notes && (
                        <p className="mt-2 text-sm text-gray-600 italic">
                          Notes: {item.notes}
                        </p>
                      )}

                      {item.status === ITEM_STATUS.PREPARING && itemTimers[itemId] && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                          <ChefHat className="w-4 h-4" />
                          Preparing for {formatTime(itemTimers[itemId])}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {item.status === ITEM_STATUS.PENDING && (
                        <>
                          <button
                            onClick={() => updateItemStatus(itemId, ITEM_STATUS.PREPARING)}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
                          >
                            <Play className="w-3 h-3" />
                            Start
                          </button>
                          <button
                            onClick={() => updateItemStatus(itemId, ITEM_STATUS.CANCELLED)}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm flex items-center gap-1"
                          >
                            <X className="w-3 h-3" />
                            Cancel
                          </button>
                        </>
                      )}
                      {item.status === ITEM_STATUS.PREPARING && (
                        <>
                          <button
                            onClick={() => updateItemStatus(itemId, ITEM_STATUS.READY)}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Ready
                          </button>
                          <button
                            onClick={() => updateItemStatus(itemId, ITEM_STATUS.PENDING)}
                            className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-sm flex items-center gap-1"
                          >
                            <Pause className="w-3 h-3" />
                            Pause
                          </button>
                          <button
                            onClick={() => updateItemStatus(itemId, ITEM_STATUS.CANCELLED)}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm flex items-center gap-1"
                          >
                            <X className="w-3 h-3" />
                            Cancel
                          </button>
                        </>
                      )}
                      {item.status === ITEM_STATUS.READY && (
                        <>
                          <button
                            onClick={() => updateItemStatus(itemId, ITEM_STATUS.COMPLETED)}
                            className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Complete
                          </button>
                          <button
                            onClick={() => updateItemStatus(itemId, ITEM_STATUS.CANCELLED)}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm flex items-center gap-1"
                          >
                            <X className="w-3 h-3" />
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KOTDetail;
