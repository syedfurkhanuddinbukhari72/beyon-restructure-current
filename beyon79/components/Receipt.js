"use client";

import React from 'react';

export default function Receipt({ order, shop = { name: 'Beyon', phone: '' } }) {
  if (!order) return null;

  const formatCurrency = (v) => `₹${Number(v || 0)}`;

  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div style={{ fontFamily: 'monospace', width: '280px', padding: 8 }}>
      <div style={{ textAlign: 'center', marginBottom: 6 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{shop.name}</div>
        {shop.phone && <div style={{ fontSize: 12 }}>{shop.phone}</div>}
        <div style={{ height: 8 }} />
      </div>

      <div style={{ fontSize: 12, marginBottom: 6 }}>
        <div>Order: {order._id || ''}</div>
        <div>{new Date(order.createdAt || Date.now()).toLocaleString()}</div>
        {order.customerName && <div>Cust: {order.customerName}</div>}
        {order.customerNumber && <div>Phone: {order.customerNumber}</div>}
      </div>

      <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', paddingTop: 6, paddingBottom: 6 }}>
        {items.map((it, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <div style={{ maxWidth: '60%' }}>{(it.quantity || 1) + ' x ' + it.name}</div>
            <div style={{ textAlign: 'right', minWidth: 60 }}>{formatCurrency((it.price || 0) * (it.quantity || 1))}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 8, fontSize: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>Subtotal</div>
          <div>{formatCurrency(order.subtotal ?? order.total ?? 0)}</div>
        </div>
        {order.discount && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>Discount</div>
            <div>-{formatCurrency(order.discount)}</div>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 6 }}>
          <div>Total</div>
          <div>{formatCurrency(order.total ?? order.subtotal ?? 0)}</div>
        </div>
      </div>

      {order.note && (
        <div style={{ marginTop: 10, fontSize: 11 }}>
          <div style={{ fontWeight: 700 }}>Note</div>
          <div>{order.note}</div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12 }}>
        Thank you!
      </div>
    </div>
  );
}
