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
  const [isThermalPreviewMode, setIsThermalPreviewMode] = useState(false);
  const [debugMode, setDebugMode] = useState(typeof window !== 'undefined' && window.location.search.includes('debug=true'));

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
    // Prevent automatic PDF download by blocking default print behavior
    // Only allow explicit print button to work
    const originalPrint = window.print;
    let printBlocked = true;
    
    window.print = function() {
      if (printBlocked) {
        console.log('Automatic print blocked - use Print button instead');
        return false;
      }
      console.log('Print allowed - proceeding with print');
      return originalPrint.apply(this, arguments);
    };

    // Allow print after a shorter delay to prevent auto-triggers but enable manual prints
    setTimeout(() => {
      printBlocked = false;
      console.log('Print blocking lifted - manual prints now allowed');
    }, 500);

    return () => {
      window.print = originalPrint;
    };
  }, []);

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
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Toggle thermal printer preview mode using state
            const newMode = !isThermalPreviewMode;
            setIsThermalPreviewMode(newMode);
            console.log('🔍 Preview button clicked');
            console.log('📋 Thermal Preview Mode:', newMode ? '✅ activated' : '❌ deactivated');
            if (debugMode) {
              console.log('🐛 Debug info:', {
                currentMode: isThermalPreviewMode,
                newMode: newMode,
                orderData: order,
                timestamp: new Date().toISOString()
              });
            }
          }}
          style={{ padding: '8px 12px', background: '#6b7280', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          Preview
        </button>
        <button
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖨️ Print button clicked');
            try {
              // Prefer the main-process print API so we can open the OS print dialog
              // and optionally preselect a preferred printer.
              const preferred = (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('preferredPrinterName')) || null;
              if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.printReceipt === 'function' && order) {
                console.log('🖨️ Using Electron API for printing');
                await window.electronAPI.printReceipt(order, { silent: false, printerName: preferred });
              } else {
                console.log('🖨️ Using browser fallback for printing');
                // Fallback for browser or if preload isn't available
                // Create a custom print window to prevent PDF download
                const thermalPreview = document.getElementById('thermal-preview');
                if (!thermalPreview) {
                  throw new Error('Thermal preview element not found');
                }
                const printWindow = window.open('', '_blank', 'width=400,height=600');
                if (printWindow) {
                  printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <title>Print Receipt</title>
                      <style>
                        body { 
                          margin: 0; 
                          padding: 20px; 
                          font-family: 'Courier New', monospace; 
                          background: ${thermalPreview?.style.background === 'rgb(0, 0, 0)' ? '#000' : '#fff'}; 
                          color: ${thermalPreview?.style.background === 'rgb(0, 0, 0)' ? '#fff' : '#000'};
                        }
                        @media print {
                          body { margin: 0; padding: 0; background: white; color: black; }
                        }
                        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                      </style>
                    </head>
                    <body>
                      ${thermalPreview?.innerHTML || ''}
                    </body>
                    </html>
                  `);
                  printWindow.document.close();
                  printWindow.focus();
                  setTimeout(() => {
                    console.log('🖨️ Triggering print in new window');
                    printWindow.print();
                    printWindow.close();
                  }, 500);
                } else {
                  throw new Error('Failed to open print window');
                }
              }
            } catch (e) {
              console.error('❌ Print handler failed:', e);
              // Fallback to standard print
              try {
                const thermalPreview = document.getElementById('thermal-preview');
                if (thermalPreview) {
                  console.log('🖨️ Using fallback print method');
                  const printWindow = window.open('', '_blank');
                  printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <title>Print Receipt</title>
                      <style>
                        body { margin: 0; padding: 20px; font-family: monospace; }
                        @media print { body { margin: 0; padding: 0; } }
                      </style>
                    </head>
                    <body>
                      ${thermalPreview.innerHTML}
                    </body>
                    </html>
                  `);
                  printWindow.document.close();
                  printWindow.print();
                  printWindow.close();
                }
              } catch (fallbackError) {
                console.error('❌ Fallback print also failed:', fallbackError);
                alert('Print failed. Please check console for details.');
              }
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
      <div style={{ paddingTop: 56, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <div 
          id="thermal-preview"
          style={{ 
            transition: 'all 0.3s ease',
            borderRadius: '8px',
            transform: 'scale(1.2)',
            transformOrigin: 'top center',
            background: isThermalPreviewMode ? '#000' : 'white',
            border: isThermalPreviewMode ? '2px solid #333' : 'none',
            padding: isThermalPreviewMode ? '20px' : '8px',
            boxShadow: isThermalPreviewMode ? '0 4px 20px rgba(0,0,0,0.3)' : 'none'
          }}
        >
          <div style={{ 
            color: isThermalPreviewMode ? '#fff' : '#000',
            textShadow: isThermalPreviewMode ? '0 0 1px rgba(255,255,255,0.5)' : 'none'
          }}>
            {/* Defensive rendering: Receipt may expect a non-null order object; provide a safe default */}
            <Receipt order={order || { items: [], total: 0, _id: null }} />
          </div>
        </div>
      </div>
    </div>
  );
}
