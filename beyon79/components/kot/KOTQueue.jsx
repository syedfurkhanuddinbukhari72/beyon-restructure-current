import React, { useState, useEffect } from 'react';
import { Clock, ChefHat, AlertTriangle, Filter, Search, SortAsc, SortDesc } from 'lucide-react';
import { KOT_STATUS, PRIORITY, KOTHelpers } from '../../models/kotModel';

const KOTQueue = ({ kotData, onKOTSelect, onStatusUpdate }) => {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedKOTs, setSelectedKOTs] = useState([]);

  const filteredAndSortedKOTs = kotData
    .filter(kot => {
      // Filter by status
      if (filter !== 'all' && kot.status !== filter) return false;
      
      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          kot.id.toLowerCase().includes(searchLower) ||
          kot.tableNumber?.toLowerCase().includes(searchLower) ||
          kot.customerName?.toLowerCase().includes(searchLower) ||
          kot.items.some(item => item.name.toLowerCase().includes(searchLower))
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      // Handle date sorting
      if (sortBy.includes('At')) {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const getStatusColor = (status) => {
    switch (status) {
      case KOT_STATUS.PENDING: return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case KOT_STATUS.CONFIRMED: return 'bg-blue-100 text-blue-800 border-blue-300';
      case KOT_STATUS.PREPARING: return 'bg-purple-100 text-purple-800 border-purple-300';
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

  const getElapsedTime = (createdAt) => {
    return KOTHelpers.getKOTAge(createdAt);
  };

  const getTimeColor = (createdAt, estimatedTime) => {
    const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000 / 60);
    
    if (estimatedTime && elapsed > estimatedTime * 1.5) {
      return 'text-red-600 font-semibold';
    } else if (estimatedTime && elapsed > estimatedTime) {
      return 'text-orange-600';
    }
    return 'text-gray-600';
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleKOTSelection = (kot) => {
    if (selectedKOTs.includes(kot.id)) {
      setSelectedKOTs(selectedKOTs.filter(id => id !== kot.id));
    } else {
      setSelectedKOTs([...selectedKOTs, kot.id]);
    }
  };

  const bulkStatusUpdate = (newStatus) => {
    selectedKOTs.forEach(kotId => {
      const kot = kotData.find(k => k.id === kotId);
      if (kot) {
        onStatusUpdate && onStatusUpdate(kot.id, newStatus);
      }
    });
    setSelectedKOTs([]);
  };

  const getStatusCount = (status) => {
    return kotData.filter(kot => kot.status === status).length;
  };

  return (
    <div className="bg-white h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Kitchen Queue</h2>
        <p className="text-sm text-gray-600 mt-1">Manage and track all kitchen orders</p>
      </div>

      {/* Filters and Search */}
      <div className="px-6 py-4 border-b border-gray-200 space-y-4">
        {/* Status Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({kotData.length})
          </button>
          <button
            onClick={() => setFilter(KOT_STATUS.PENDING)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === KOT_STATUS.PENDING 
                ? 'bg-yellow-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending ({getStatusCount(KOT_STATUS.PENDING)})
          </button>
          <button
            onClick={() => setFilter(KOT_STATUS.CONFIRMED)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === KOT_STATUS.CONFIRMED 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Confirmed ({getStatusCount(KOT_STATUS.CONFIRMED)})
          </button>
          <button
            onClick={() => setFilter(KOT_STATUS.PREPARING)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === KOT_STATUS.PREPARING 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Preparing ({getStatusCount(KOT_STATUS.PREPARING)})
          </button>
          <button
            onClick={() => setFilter(KOT_STATUS.READY)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === KOT_STATUS.READY 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Ready ({getStatusCount(KOT_STATUS.READY)})
          </button>
        </div>

        {/* Search and Sort */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by KOT ID, table, customer, or items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => toggleSort('createdAt')}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              Time
            </button>
            <button
              onClick={() => toggleSort('priority')}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              Priority
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedKOTs.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <span className="text-sm text-blue-800">
              {selectedKOTs.length} orders selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => bulkStatusUpdate(KOT_STATUS.CONFIRMED)}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
              >
                Confirm Selected
              </button>
              <button
                onClick={() => bulkStatusUpdate(KOT_STATUS.PREPARING)}
                className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition-colors"
              >
                Start Selected
              </button>
              <button
                onClick={() => setSelectedKOTs([])}
                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* KOT List */}
      <div className="flex-1 overflow-auto">
        {filteredAndSortedKOTs.length === 0 ? (
          <div className="p-8 text-center">
            <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No orders match your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredAndSortedKOTs.map((kot) => (
              <div
                key={kot.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedKOTs.includes(kot.id) ? 'bg-blue-50' : ''
                }`}
                onClick={() => onKOTSelect && onKOTSelect(kot)}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selectedKOTs.includes(kot.id)}
                    onChange={() => handleKOTSelection(kot)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{kot.id}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(kot.status)}`}>
                        {(typeof kot.status === 'string' ? kot.status : 
                          (typeof kot.status === 'object' && kot.status.status) ? kot.status.status : 
                          'PENDING').toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(kot.priority)}`}>
                        {(typeof kot.priority === 'string' ? kot.priority : 
                          (typeof kot.priority === 'object' && kot.priority.priority) ? kot.priority.priority : 
                          'normal').toUpperCase()}
                      </span>
                      {kot.tableNumber && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                          Table {kot.tableNumber}
                        </span>
                      )}
                      {kot.estimatedTime && getElapsedTime(kot.createdAt) > kot.estimatedTime && (
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <span>{kot.items.length} items</span>
                      <span>₹{kot.totalAmount}</span>
                      <span className={getTimeColor(kot.createdAt, kot.estimatedTime)}>
                        <Clock className="w-4 h-4 inline mr-1" />
                        {getElapsedTime(kot.createdAt)}
                        {kot.estimatedTime && ` / ${kot.estimatedTime}m est.`}
                      </span>
                      {kot.orderType && <span>{kot.orderType}</span>}
                    </div>

                    {/* Items Preview */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {kot.items.slice(0, 3).map((item, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                        >
                          {item.quantity}x {item.name}
                        </span>
                      ))}
                      {kot.items.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          +{kot.items.length - 3} more
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{
                            width: `${(kot.items.filter(item => 
                              item.status === 'ready' || item.status === 'completed'
                            ).length / kot.items.length) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">
                        {kot.items.filter(item => 
                          item.status === 'ready' || item.status === 'completed'
                        ).length}/{kot.items.length} ready
                      </span>
                    </div>

                    {kot.notes && (
                      <p className="mt-2 text-sm text-gray-600 italic">
                        Note: {kot.notes}
                      </p>
                    )}
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

export default KOTQueue;
