import React, { useState, useMemo } from 'react';
import { Clock, ChefHat, CheckCircle, AlertCircle, Eye, Filter } from 'lucide-react';
import { KOT_STATUS, PRIORITY, KOTHelpers } from '../../models/kotModel';

const KOTOrders = ({ kotData, onKOTSelect, onStatusUpdate }) => {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Helper function to safely extract status
  const getStatus = (kot) => {
    if (typeof kot.status === 'string') return kot.status;
    if (typeof kot.status === 'object' && kot.status.status) return kot.status.status;
    return 'PENDING';
  };

  // Helper function to safely extract priority
  const getPriority = (kot) => {
    if (typeof kot.priority === 'string') return kot.priority;
    if (typeof kot.priority === 'object' && kot.priority.priority) return kot.priority.priority;
    return 'normal';
  };

  // Filter and search KOTs
  const filteredKOTs = useMemo(() => {
    return kotData.filter(kot => {
      const status = getStatus(kot);
      const priority = getPriority(kot);
      
      // Apply status filter
      if (filter !== 'all' && status !== filter) return false;
      
      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          kot.id?.toLowerCase().includes(searchLower) ||
          kot.orderId?.toLowerCase().includes(searchLower) ||
          kot.customerName?.toLowerCase().includes(searchLower) ||
          kot.tableNumber?.toString().includes(searchLower) ||
          kot.items?.some(item => item.name?.toLowerCase().includes(searchLower))
        );
      }
      
      return true;
    });
  }, [kotData, filter, searchTerm]);

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case KOT_STATUS.PENDING: return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case KOT_STATUS.CONFIRMED: return 'bg-blue-100 text-blue-800 border-blue-300';
      case KOT_STATUS.PREPARING: return 'bg-purple-100 text-purple-800 border-purple-300';
      case KOT_STATUS.READY: return 'bg-green-100 text-green-800 border-green-300';
      case KOT_STATUS.COMPLETED: return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate elapsed time
  const getElapsedTime = (createdAt) => {
    if (!createdAt) return '—';
    const now = new Date();
    const created = new Date(createdAt);
    const diff = now - created;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Get status counts
  const getStatusCount = (status) => {
    return kotData.filter(kot => getStatus(kot) === status).length;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Kitchen Orders</h2>
        
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by order ID, customer, table, or items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'All', count: kotData.length },
              { id: KOT_STATUS.PENDING, label: 'Pending', count: getStatusCount(KOT_STATUS.PENDING) },
              { id: KOT_STATUS.CONFIRMED, label: 'Confirmed', count: getStatusCount(KOT_STATUS.CONFIRMED) },
              { id: KOT_STATUS.PREPARING, label: 'Preparing', count: getStatusCount(KOT_STATUS.PREPARING) },
              { id: KOT_STATUS.READY, label: 'Ready', count: getStatusCount(KOT_STATUS.READY) },
              { id: KOT_STATUS.COMPLETED, label: 'Completed', count: getStatusCount(KOT_STATUS.COMPLETED) }
            ].map((statusFilter) => (
              <button
                key={statusFilter.id}
                onClick={() => setFilter(statusFilter.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === statusFilter.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {statusFilter.label}
                <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                  {statusFilter.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Table
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredKOTs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || filter !== 'all' 
                      ? 'No orders found matching your criteria' 
                      : 'No orders available'}
                  </td>
                </tr>
              ) : (
                filteredKOTs.map((kot, index) => {
                  const status = getStatus(kot);
                  const priority = getPriority(kot);
                  const readyItems = Array.isArray(kot.items) ? kot.items.filter(item => 
                    item.status === 'ready' || item.status === 'completed'
                  ).length : 0;
                  
                  return (
                    <tr key={`${kot.source}-${kot.id}-${kot.createdAt || index}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {String(kot.id ?? 'UNKNOWN')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {kot.customerName || 'Guest'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(status)}`}>
                          {String(status).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(priority)}`}>
                          {String(priority).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {Array.isArray(kot.items) ? kot.items.length : 0} items
                          {readyItems > 0 && (
                            <span className="text-green-600 ml-1">
                              ({readyItems} ready)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 max-w-xs truncate">
                          {Array.isArray(kot.items) ? kot.items.slice(0, 2).map(item => item.name || 'Unknown Item').join(', ') : ''}
                          {Array.isArray(kot.items) && kot.items.length > 2 && '...'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {kot.tableNumber || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {getElapsedTime(kot.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => onKOTSelect?.(kot)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {/* Quick status actions */}
                        {status === KOT_STATUS.PENDING && (
                          <button
                            onClick={() => onStatusUpdate?.(kot.id, KOT_STATUS.CONFIRMED)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Confirm Order"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        
                        {(status === KOT_STATUS.CONFIRMED || status === KOT_STATUS.PREPARING) && (
                          <button
                            onClick={() => onStatusUpdate?.(kot.id, KOT_STATUS.READY)}
                            className="text-green-600 hover:text-green-900"
                            title="Mark Ready"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        
                        {status === KOT_STATUS.READY && (
                          <button
                            onClick={() => onStatusUpdate?.(kot.id, KOT_STATUS.COMPLETED)}
                            className="text-emerald-600 hover:text-emerald-900"
                            title="Complete Order"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {filteredKOTs.length} of {kotData.length} orders
          </div>
          {filteredKOTs.length > 0 && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded-full mr-2"></div>
                Pending: {getStatusCount(KOT_STATUS.PENDING)}
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded-full mr-2"></div>
                Preparing: {getStatusCount(KOT_STATUS.PREPARING)}
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-100 border border-green-300 rounded-full mr-2"></div>
                Ready: {getStatusCount(KOT_STATUS.READY)}
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-emerald-100 border border-emerald-300 rounded-full mr-2"></div>
                Completed: {getStatusCount(KOT_STATUS.COMPLETED)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KOTOrders;
