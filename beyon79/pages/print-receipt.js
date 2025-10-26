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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log('print page ready', { initialOrder: order });
    // prevent hydration mismatch by waiting until client mount to render
    setMounted(true);
    if (!order && typeof window !== 'undefined') {
      // Listen for a postMessage from main process or opener
      const onMsg = (ev) => {
        try {
          const d = ev.data;
          if (d && d.type === 'print-order' && d.order) {
            console.log('print page received order via postMessage', d.order);
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
    // Previously we auto-triggered window.print() here. For a better preview flow
    // we intentionally do NOT auto-print so staff can inspect the rendered receipt
    // and press the Print button when ready. Keep this effect in place to listen
    // for order changes from window.postMessage (handled above).
    return undefined;
  }, [order]);

  // Avoid rendering on the server / during hydration mismatch window
  if (!mounted) return <div />;

  return (
    <div>
      <div style={{ position: 'fixed', top: 8, right: 8, zIndex: 9999, display: 'flex', gap: 8 }}>
        <button
          onClick={async () => {
            try {
              // Prefer the main-process print API so we can open the OS print dialog
              // and optionally preselect a preferred printer.
              const preferred = (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('preferredPrinterName')) || null;
              if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.printReceipt === 'function' && order) {
                await window.electronAPI.printReceipt(order, { silent: false, printerName: preferred });
              } else {
                // Fallback for browser or if preload isn't available
                try { window.print(); } catch (e) { console.warn('Print failed', e); }
              }
            } catch (e) {
              console.error('Print handler failed', e);
              try { window.print(); } catch (err) { /* ignore */ }
            }
          }}
          style={{ padding: '8px 12px', background: '#f97316', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          Print
        </button>
        <button
          onClick={() => {
            try { window.close(); } catch (e) { /* ignore */ }
          }}
          style={{ padding: '8px 12px', background: '#e5e7eb', color: '#111827', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          Close
        </button>
      </div>
      <div style={{ paddingTop: 56 }}>
        {/* Defensive rendering: Receipt may expect a non-null order object; provide a safe default */}
        <Receipt order={order || { items: [], total: 0, _id: null }} />
      </div>
    </div>
  );
}
