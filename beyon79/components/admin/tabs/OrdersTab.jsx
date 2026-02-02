import React from 'react';
import OrderRow from '../OrderRow';
import { formatDate } from '../../../helpers/adminFormatters';

const OrdersTab = ({
  filteredOrders,
  loading,
  lazyLoad,
  expandedOrderId,
  tab,
  onToggleExpand,
  onUpdateStatus,
  onUpdateLocalStatus,
  onDeleteLocalOrder,
  now
}) => {
  // Debug: Check if onUpdateLocalStatus is a function
  console.log('onUpdateLocalStatus type:', typeof onUpdateLocalStatus);
  console.log('onUpdateLocalStatus:', onUpdateLocalStatus);

  // Debug all orders and their status when tab changes
  console.log('🔍 OrdersTab - Tab:', tab, 'Total orders:', filteredOrders.length);
  filteredOrders.forEach((order, index) => {
    console.log(`  ${index + 1}. Order ${order._id || order.id}:`, {
      status: order.status,
      kotCompleted: order.kotCompleted,
      source: order.source,
      itemsCount: order.items?.length || 0,
      itemStatuses: order.items?.map(i => ({ name: i.name, status: i.status }))
    });
  });

  // Debug Ready tab filtering
  if (tab === 'Ready') {
    console.log('🔍 OrdersTab - Ready tab debug:', {
      tab,
      filteredOrdersCount: filteredOrders.length,
      filteredOrders: filteredOrders.map(o => ({
        id: o._id,
        status: o.status,
        source: o.source,
        kotCompleted: o.kotCompleted,
        isKOT: o._id?.startsWith('KOT-'),
        hasItems: o.items?.length > 0
      })),
      lazyLoad,
      loading
    });

    // Check if target orders are in filtered results
    const targetOrder1 = filteredOrders.find(o => o._id === 'KOT-1769618963803-6QXT5KIX7');
    const targetOrder2 = filteredOrders.find(o => o._id === 'KOT-1769618963804-ABC123DEF');
    console.log('🎯 TARGET ORDERS IN ORDERS TAB:', {
      'KOT-1769618963803-6QXT5KIX7': !!targetOrder1,
      'KOT-1769618963804-ABC123DEF': !!targetOrder2,
      order1: targetOrder1 ? {
        id: targetOrder1._id,
        status: targetOrder1.status,
        kotCompleted: targetOrder1.kotCompleted,
        source: targetOrder1.source
      } : null,
      order2: targetOrder2 ? {
        id: targetOrder2._id,
        status: targetOrder2.status,
        kotCompleted: targetOrder2.kotCompleted,
        source: targetOrder2.source
      } : null
    });

    // Log each order being rendered
    console.log('📋 OrdersTab - Rendering orders:');
    filteredOrders.forEach((o, i) => {
      console.log(`  ${i+1}. ${o._id} - Status: ${o.status}, kotCompleted: ${o.kotCompleted}, Source: ${o.source}`);
    });
  }

  if (lazyLoad || loading) {
    return (
      <div className="flex justify-center items-center my-8">
        <div className="tab-loader">
          <div className="loader-background"></div>
          <div className="loader-arc"></div>
        </div>
        <span className="ml-2 text-orange-600">Loading orders...</span>
      </div>
    );
  }

  if (filteredOrders.length === 0) {
    return <p className="text-gray-600">No orders found</p>;
  }

  return (
    <div className="overflow-x-auto scrollbar-orange">
      <table 
        role="table" 
        className={`border border-gray-200 w-full text-[13px] table-fixed bg-white rounded-lg overflow-hidden text-gray-800 border-collapse ${
          tab === 'Archived' ? 'min-w-[940px]' : 'min-w-[1100px]'
        }`}
      >
        <colgroup>
          <col className="w-[140px]" />
          <col />
          <col className="w-[100px]" />
          <col className="w-[120px]" />
          <col className="w-[120px]" />
          <col className="w-[80px]" />
          {tab !== 'Archived' && <col className="w-[200px]" />}
        </colgroup>
        <thead className="overflow-hidden">
          <tr className="bg-gray-50 text-left text-gray-600 border-2 border-gray-400 rounded-md" role="row" style={{ boxShadow: '0 0 8px 2px rgba(30,41,59,0.13)' }}>
            <th scope="col" className="px-2.5 py-2.5 text-[10.5px] text-gray-900 uppercase tracking-wide font-semibold w-32" style={{ textShadow: '0 0 8px rgba(30,41,59,0.13), 0 0 3px rgba(30,41,59,0.10)' }}>Customer</th>
            <th scope="col" className="px-2.5 py-2.5 text-[10.5px] text-gray-900 uppercase tracking-wide font-semibold" style={{ textShadow: '0 0 8px rgba(30,41,59,0.13), 0 0 3px rgba(30,41,59,0.10)' }}>Items</th>
            <th scope="col" className="px-2.5 py-2.5 text-[10.5px] text-gray-900 uppercase tracking-wide font-semibold" style={{ textShadow: '0 0 8px rgba(30,41,59,0.13), 0 0 3px rgba(30,41,59,0.10)' }}>Total</th>
            <th scope="col" className="px-2.5 py-2.5 text-[10.5px] text-gray-900 uppercase tracking-wide font-semibold" style={{ textShadow: '0 0 8px rgba(30,41,59,0.13), 0 0 3px rgba(30,41,59,0.10)' }}>Status</th>
            <th scope="col" className="px-2.5 py-2.5 text-[10.5px] text-gray-900 uppercase tracking-wide font-semibold" style={{ textShadow: '0 0 8px rgba(30,41,59,0.13), 0 0 3px rgba(30,41,59,0.10)' }}>Order Date</th>
            <th scope="col" className="px-2.5 py-2.5 text-[10.5px] text-gray-900 uppercase tracking-wide font-semibold" style={{ textShadow: '0 0 8px rgba(30,41,59,0.13), 0 0 3px rgba(30,41,59,0.10)' }}>Timer</th>
            {tab !== 'Archived' && (
              <th scope="col" className="px-2.5 py-2.5 text-[10.5px] text-gray-900 uppercase tracking-wide font-semibold" style={{ textShadow: '0 0 8px rgba(30,41,59,0.13), 0 0 3px rgba(30,41,59,0.10)' }}>Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map((o) => {
            const isExpanded = expandedOrderId === o._id;
            
            // 🔥 NEW: Handle virtual cancelled items
            if (o.orderType === 'cancelled-item') {
              return (
                <tr key={o._id} className="bg-red-50 hover:bg-red-100">
                  <td className="px-2.5 py-2.5 border-b border-gray-200 align-middle">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-red-700">
                        {o.customerName || 'KOT Customer'}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-300">
                        KOT Cancelled
                      </span>
                    </div>
                  </td>
                  <td className="px-2.5 py-2.5 border-b border-gray-200 align-middle">
                    <div className="flex items-center gap-2">
                      <span className="text-red-600">✗</span>
                      <span className="text-sm">{o.name} x{o.quantity}</span>
                    </div>
                  </td>
                  <td className="px-2.5 py-2.5 border-b border-gray-200 align-middle">
                    <span className="text-sm text-gray-600">—</span>
                  </td>
                  <td className="px-2.5 py-2.5 border-b border-gray-200 align-middle">
                    <span className="inline-flex items-center px-2 rounded-full text-[10px] font-semibold bg-red-100 text-red-800">
                      Cancelled
                    </span>
                  </td>
                  <td className="px-2.5 py-2.5 border-b border-gray-200 align-middle">
                    <span className="text-sm text-gray-600">{formatDate(o.createdAt)}</span>
                  </td>
                  <td className="px-2.5 py-2.5 border-b border-gray-200 align-middle">
                    <span className="text-sm text-gray-600">—</span>
                  </td>
                  <td className="px-2.5 py-2.5 border-b border-gray-200 align-middle">
                    <div className="text-xs text-red-600">
                      Order ID: {o.orderId}
                    </div>
                  </td>
                </tr>
              );
            }
            
            if (isExpanded) {
              // Render a single replacement row with detailed items
              const items = Array.isArray(o.items) ? o.items : [];
              const cols = tab === 'Archived' ? 6 : 7; // number of visible columns when expanded
              return (
                <tr key={`${o._id}-expanded`} className="bg-white hover:bg-white">
                  <td colSpan={cols} className="px-3 py-3 border-b border-gray-200 align-top">
                    <div
                      className="flex items-start justify-between cursor-pointer select-none"
                      onClick={() => onToggleExpand(o._id)}
                      role="button"
                      aria-label="Collapse details"
                    >
                      <div>
                        <div className="text-sm font-semibold text-gray-700 mb-1">Items</div>
                        {items.length === 0 ? (
                          <div className="text-sm text-gray-600">No items</div>
                        ) : (
                          <ul className="text-sm text-gray-800 list-disc pl-5 space-y-1">
                            {items.map((it, idx) => {
                              const name = it?.name || 'Item';
                              const qty = Number(it?.quantity || it?.qty || 1);
                              const status = it?.status || 'pending';
                              
                              // 🔥 KOT STATUS INDICATORS
                              let statusIcon = null;
                              if (status === 'ready' || status === 'completed') {
                                statusIcon = <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold ml-2">✓</span>;
                              } else if (status === 'cancelled') {
                                statusIcon = <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs font-bold ml-2">✗</span>;
                              }
                              
                              const line = `${name} x${qty}`;
                              return (
                                <li key={idx} className="flex items-center justify-between">
                                  <span>{line}</span>
                                  {statusIcon}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleExpand(o._id); }}
                        className="ml-4 inline-flex items-center justify-center h-7 px-3 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                      >
                        Close
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }
            return (
              <OrderRow
                key={o.id || o._id}
                order={o}
                tab={tab}
                now={now}
                onUpdateStatus={onUpdateStatus}
                onUpdateLocalStatus={onUpdateLocalStatus}
                onDeleteLocalOrder={onDeleteLocalOrder}
                onToggleExpand={onToggleExpand}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default OrdersTab;
