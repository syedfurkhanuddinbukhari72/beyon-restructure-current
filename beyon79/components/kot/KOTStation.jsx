import React, { useState, useEffect } from 'react';
import { ChefHat, Clock, Users, AlertCircle, TrendingUp, Activity } from 'lucide-react';
import { KitchenStation, KOT_STATUS, ITEM_STATUS } from '../../models/kotModel';

const KOTStation = ({ station, kotData, onItemAssign, onStationUpdate }) => {
  const [stationLoad, setStationLoad] = useState(0);
  const [assignedItems, setAssignedItems] = useState([]);
  const [stationStats, setStationStats] = useState({
    totalItems: 0,
    preparingItems: 0,
    readyItems: 0,
    avgPrepTime: 0
  });

  useEffect(() => {
    if (station && kotData) {
      calculateStationMetrics();
    }
  }, [station, kotData]);

  const calculateStationMetrics = () => {
    // Get all items assigned to this station
    const items = kotData
      .filter(kot => kot.status !== KOT_STATUS.COMPLETED && kot.status !== KOT_STATUS.CANCELLED)
      .flatMap(kot => kot.items)
      .filter(item => item.assignedTo === station.id);

    setAssignedItems(items);

    // Calculate station statistics
    const stats = items.reduce((acc, item) => {
      acc.totalItems++;
      
      switch (item.status) {
        case ITEM_STATUS.PREPARING:
          acc.preparingItems++;
          break;
        case ITEM_STATUS.READY:
        case ITEM_STATUS.COMPLETED:
          acc.readyItems++;
          break;
      }
      
      if (item.actualPrepTime) {
        acc.totalPrepTime += item.actualPrepTime;
        acc.completedItems++;
      }
      
      return acc;
    }, {
      totalItems: 0,
      preparingItems: 0,
      readyItems: 0,
      totalPrepTime: 0,
      completedItems: 0
    });

    stats.avgPrepTime = stats.completedItems > 0 
      ? Math.round(stats.totalPrepTime / stats.completedItems)
      : 0;

    setStationStats(stats);
    setStationLoad((stats.preparingItems / station.capacity) * 100);
  };

  const getLoadColor = (load) => {
    if (load >= 90) return 'text-red-600 bg-red-100';
    if (load >= 70) return 'text-orange-600 bg-orange-100';
    if (load >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
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

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getElapsedTime = (startedAt) => {
    if (!startedAt) return null;
    
    const now = Date.now();
    const started = new Date(startedAt).getTime();
    const elapsed = Math.floor((now - started) / 1000 / 60); // minutes
    
    if (elapsed < 1) return 'Just started';
    if (elapsed < 60) return `${elapsed}m`;
    
    const hours = Math.floor(elapsed / 60);
    const minutes = elapsed % 60;
    return `${hours}h ${minutes}m`;
  };

  const getKOTById = (kotId) => {
    return kotData.find(kot => kot.id === kotId);
  };

  const handleStationStatusToggle = () => {
    const newStatus = station.status === 'active' ? 'inactive' : 'active';
    onStationUpdate && onStationUpdate(station.id, { status: newStatus });
  };

  if (!station) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Station not found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow h-full flex flex-col">
      {/* Station Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${station.status === 'active' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{station.name}</h3>
              <p className="text-sm text-gray-600">{station.description}</p>
            </div>
          </div>
          
          <button
            onClick={handleStationStatusToggle}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              station.status === 'active'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            {station.status === 'active' ? 'Active' : 'Inactive'}
          </button>
        </div>

        {/* Station Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stationStats.totalItems}</div>
            <div className="text-sm text-gray-600">Total Items</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stationStats.preparingItems}</div>
            <div className="text-sm text-gray-600">Preparing</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stationStats.readyItems}</div>
            <div className="text-sm text-gray-600">Ready</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stationStats.avgPrepTime}m</div>
            <div className="text-sm text-gray-600">Avg Time</div>
          </div>
        </div>

        {/* Load Indicator */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Station Load</span>
            <span className={`text-sm font-medium px-2 py-1 rounded ${getLoadColor(stationLoad)}`}>
              {Math.round(stationLoad)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                stationLoad >= 90 ? 'bg-red-500' :
                stationLoad >= 70 ? 'bg-orange-500' :
                stationLoad >= 50 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${stationLoad}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>{stationStats.preparingItems} items</span>
            <span>Capacity: {station.capacity}</span>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="px-6 py-3 border-b border-gray-200">
        <div className="flex flex-wrap gap-2">
          {station.categories.map((category) => (
            <span
              key={category}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
            >
              {category}
            </span>
          ))}
        </div>
      </div>

      {/* Assigned Items */}
      <div className="flex-1 overflow-auto p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Current Items</h4>
        
        {assignedItems.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No items assigned to this station</p>
            <p className="text-sm text-gray-400 mt-2">
              Items from {station.categories.join(', ')} categories will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignedItems.map((item) => {
              const kot = getKOTById(item.kotId);
              return (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-medium text-gray-900">{item.name}</h5>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          Qty: {item.quantity}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getItemStatusColor(item.status)}`}>
                          {item.status.toUpperCase()}
                        </span>
                      </div>
                      
                      {kot && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">{kot.id}</span>
                          {kot.tableNumber && ` • Table ${kot.tableNumber}`}
                          {kot.orderType && ` • ${kot.orderType}`}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {item.startedAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {getElapsedTime(item.startedAt)}
                      </span>
                    )}
                    {item.preparationTime && (
                      <span>Est. {item.preparationTime}m</span>
                    )}
                    {item.actualPrepTime && (
                      <span className="text-green-600">Actual: {item.actualPrepTime}m</span>
                    )}
                  </div>

                  {item.notes && (
                    <p className="mt-2 text-sm text-gray-600 italic">
                      Notes: {item.notes}
                    </p>
                  )}

                  {/* Item Progress */}
                  {item.status === ITEM_STATUS.PREPARING && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <ChefHat className="w-4 h-4" />
                        <span>In preparation...</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Station Performance */}
      {stationStats.totalItems > 0 && (
        <div className="p-6 border-t border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Performance</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Efficiency</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {stationStats.completedItems > 0 
                  ? Math.round((stationStats.readyItems / stationStats.totalItems) * 100)
                  : 0}%
              </div>
              <div className="text-xs text-gray-600">Items completed on time</div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Throughput</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {stationStats.completedItems > 0 
                  ? (stationStats.completedItems / station.capacity).toFixed(1)
                  : 0}
              </div>
              <div className="text-xs text-gray-600">Items per capacity</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KOTStation;
