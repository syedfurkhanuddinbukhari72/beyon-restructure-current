"use client";

import React, { useEffect, useState } from 'react';
import Receipt from '../components/Receipt';

function parseOrderFromQuery() {
  try {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('order');
    if (encoded) {
      const json = decodeURIComponent(encoded);
      return JSON.parse(json);
    }
    return null;
  } catch (e) {
    console.warn('Failed to parse order from query', e);
    return null;
  }
}

export default function PrintReceiptPage() {
  const [order, setOrder] = useState(() => parseOrderFromQuery());

  useEffect(() => {
    if (!order && typeof window !== 'undefined') {
      // Listen for a postMessage from main process or opener
      const onMsg = (ev) => {
        try {
          const d = ev.data;
          if (d && d.type === 'print-order' && d.order) {
            setOrder(d.order);
          }
        } catch (e) {
          // ignore
        }
      };
      window.addEventListener('message', onMsg);
      return () => window.removeEventListener('message', onMsg);
    }
    return undefined;
  }, [order]);

  useEffect(() => {
    if (order) {
      // Small delay to ensure render, then trigger print
      const t = setTimeout(() => {
        try {
          window.print();
        } catch (e) {
          console.warn('Print failed', e);
        }
      }, 300);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [order]);

  return (
    <div>
      <Receipt order={order} />
    </div>
  );
}
