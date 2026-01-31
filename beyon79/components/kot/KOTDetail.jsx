import React, { useState, useEffect } from 'react';
import { Clock, ChefHat, CheckCircle, AlertCircle, Play, Pause, X, Edit2, Save, User, Timer } from 'lucide-react';
import { KOT_STATUS, ITEM_STATUS, PRIORITY, KOTHelpers } from '../../models/kotModel';

const KOTDetail = ({ kot, onUpdate, onClose }) => {
  const [editingNotes, setEditingNotes] = useState(false);
  const [kitchenNotes, setKitchenNotes] = useState(kot?.kitchenNotes || '');
  const [itemTimers, setItemTimers] = useState({});

  useEffect(() => {
    console.log('🔄 KOTDetail - kot prop changed, new status:', kot?.status);
    if (kot) {
      setKitchenNotes(kot.kitchenNotes || '');
      // Initialize timers for items that are being prepared
      const timers = {};
      kot.items.forEach((item, index) => {
        const itemId = item.id || `${kot.id}-item-${index}`;
        if (item.status === ITEM_STATUS.PREPARING && item.startedAt) {
          const elapsed = Date.now() - new Date(item.startedAt).getTime();
          timers[itemId] = elapsed;
          console.log(`⏰ Initialized timer for item ${itemId} (${item.name}): ${formatTime(elapsed)}`);
        }
      });
      setItemTimers(timers);
      console.log('📊 Timers initialized for', Object.keys(timers).length, 'preparing items');
    }
  }, [kot]);

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
  }, [kot]);

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

    const allCompleted = updatedItems.every(item => 
      item.status === ITEM_STATUS.COMPLETED || item.status === ITEM_STATUS.CANCELLED
    );

    const updatedKOT = {
      ...kot,
      items: updatedItems,
      status: allCompleted ? KOT_STATUS.COMPLETED : kot.status,
      completedAt: allCompleted ? new Date().toISOString() : kot.completedAt
    };

    console.log('🔄 Calling onUpdate with updated KOT:', updatedKOT);
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
      window.showToast(`Order ${kot.id} bulk completed - all items marked as finished`);
    }
  };

  const handleBulkStartPreparation = () => {
    console.log('🚀 Starting preparation for all items in KOT:', kot.id);
    console.log('📋 Current items:', kot.items.map(i => ({ name: i.name, status: i.status })));
    
    const now = new Date().toISOString();
    
    // Update ALL items to PREPARING status immediately
    const updatedItems = kot.items.map((item, index) => {
      // Ensure each item has a unique ID
      const itemId = item.id || `${kot.id}-item-${index}`;
      
      console.log(`🔄 Updating item ${itemId}: ${item.name} -> PREPARING`);
      
      return {
        ...item,
        id: itemId, // Ensure item has an ID
        status: ITEM_STATUS.PREPARING,
        startedAt: now // All items start at the same time
      };
    });

    console.log('✅ Updated all items to PREPARING:', updatedItems.map(i => ({ name: i.name, status: i.status })));

    // Update the entire KOT to PREPARING status
    const updatedKOT = {
      ...kot,
      status: KOT_STATUS.PREPARING,
      items: updatedItems,
      startedAt: now // Set KOT start time
    };

    console.log('🔄 Calling onUpdate with KOT:', {
      id: updatedKOT.id,
      status: updatedKOT.status,
      startedAt: updatedKOT.startedAt,
      itemCount: updatedKOT.items.length,
      itemStatuses: updatedKOT.items.map(i => ({ name: i.name, status: i.status, startedAt: i.startedAt }))
    });
    
    // Call the update function
    onUpdate(updatedKOT);

    // Initialize timers immediately for all items
    const newTimers = {};
    updatedItems.forEach(item => {
      newTimers[item.id] = 0; // Start timer at 0
    });
    setItemTimers(newTimers);

    if (typeof window !== 'undefined' && window.showToast) {
      window.showToast(`Order ${kot.id} - preparation started for all ${updatedItems.length} items`);
    }
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
      window.showToast(`Order ${kot.id} - all items marked as ready`);
    }
  };

  const updateKOTStatus = (newStatus) => {
    console.log('🔄 KOTDetail updateKOTStatus called:', { 
      kotId: kot.id, 
      newStatus, 
      currentStatus: kot.status,
      currentItems: kot.items.map(i => ({ name: i.name, status: i.status }))
    });
    
    const updatedKOT = { ...kot, status: newStatus };
    
    // Add timestamps based on status
    if (newStatus === KOT_STATUS.CONFIRMED && !kot.confirmedAt) {
      updatedKOT.confirmedAt = new Date().toISOString();
      console.log('✅ KOT confirmed at:', updatedKOT.confirmedAt);
      // Keep items as PENDING when KOT is confirmed (they'll be updated when preparation starts)
      updatedKOT.items = kot.items.map(item => ({
        ...item,
        status: ITEM_STATUS.PENDING
      }));
      console.log('📋 Items kept as PENDING after confirmation');
    } else if (newStatus === KOT_STATUS.PREPARING && !kot.startedAt) {
      updatedKOT.startedAt = new Date().toISOString();
      console.log('🚀 KOT preparation started at:', updatedKOT.startedAt);
      // Update all items to PREPARING status
      updatedKOT.items = kot.items.map((item, index) => {
        const itemId = item.id || `${kot.id}-item-${index}`;
        console.log(`🔄 Setting item ${itemId} (${item.name}) to PREPARING`);
        return {
          ...item,
          id: itemId,
          status: ITEM_STATUS.PREPARING,
          startedAt: new Date().toISOString()
        };
      });
      console.log('📋 All items set to PREPARING');
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
      console.log('📋 All items set to COMPLETED');
    }

    console.log('🔄 Calling onUpdate with KOT:', {
      id: updatedKOT.id,
      status: updatedKOT.status,
      itemCount: updatedKOT.items.length,
      itemStatuses: updatedKOT.items.map(i => ({ name: i.name, status: i.status }))
    });
    
    console.log('🔄 KOTDetail - before onUpdate, kot.status:', kot.status);
    onUpdate(updatedKOT);
    console.log('🔄 KOTDetail - after onUpdate call');
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
      window.showToast(`Order ${kot.id} has been cancelled`);
    }

    // Close the detail view after cancelling
    onClose();
  };

  if (!kot) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Select a KOT to view details</p>
      </div>
    );
  }

  return (
    <div className="bg-white h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-900">{kot.id}</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getItemStatusColor(kot.status)}`}>
              {(typeof kot.status === 'string' ? kot.status : 
                (typeof kot.status === 'object' && kot.status.status) ? kot.status.status : 
                'pending').toUpperCase()}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(kot.priority)}`}>
              {(typeof kot.priority === 'string' ? kot.priority : 
                (typeof kot.priority === 'object' && kot.priority.priority) ? kot.priority.priority : 
                'normal').toUpperCase()}
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
          {console.log('🔍 Button rendering check:', {
            kotStatus: kot.status,
            isPending: kot.status === KOT_STATUS.PENDING,
            isConfirmed: kot.status === KOT_STATUS.CONFIRMED,
            isPreparing: kot.status === KOT_STATUS.PREPARING,
            isReady: kot.status === KOT_STATUS.READY
          })}
          
          {kot.status === KOT_STATUS.PENDING && (
            <button
              onClick={() => updateKOTStatus(KOT_STATUS.CONFIRMED)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Confirm All
            </button>
          )}
          {kot.status === KOT_STATUS.CONFIRMED && (
            <button
              onClick={handleBulkStartPreparation}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start Preparation
            </button>
          )}
          {kot.status === KOT_STATUS.PREPARING && (
            <button
              onClick={handleBulkMarkReady}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Mark Ready
            </button>
          )}
          {kot.status === KOT_STATUS.READY && (
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
                          {(typeof item.status === 'string' ? item.status : 
                            (typeof item.status === 'object' && item.status.status) ? item.status.status : 
                            'pending').toUpperCase()}
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
                        <button
                          onClick={() => updateItemStatus(itemId, ITEM_STATUS.PREPARING)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" />
                          Start
                        </button>
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
                        </>
                      )}
                      {item.status === ITEM_STATUS.READY && (
                        <button
                          onClick={() => updateItemStatus(itemId, ITEM_STATUS.COMPLETED)}
                          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm flex items-center gap-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Complete
                        </button>
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
