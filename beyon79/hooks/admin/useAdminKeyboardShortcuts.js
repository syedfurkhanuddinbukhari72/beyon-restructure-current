import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';

export const useAdminKeyboardShortcuts = (handleTabChange, showToast, expandedOrderId, filteredOrders, messageListenerRef) => {
  const router = useRouter();

  const handleMessage = useCallback((e) => {
    try {
      const d = e.data;
      if (!d || d.type !== 'beyon:app-shortcut') return;
      const payload = d.payload || {};
      console.log('[admin-unified] handleMessage received payload', payload);
      const action = payload.action;
      if (!action) return;
      
      switch (action) {
        case 'switch_to_active_tab':
          console.log('[admin-unified] switching to Active');
          handleTabChange('Active');
          showToast('Switched to Active tab');
          break;
        case 'switch_to_ready_tab':
          console.log('[admin-unified] switching to Ready');
          handleTabChange('Ready');
          showToast('Switched to Ready tab');
          break;
        case 'switch_to_paid_tab':
          console.log('[admin-unified] switching to Paid');
          handleTabChange('Paid');
          showToast('Switched to Paid tab');
          break;
        case 'switch_to_archive_tab':
          console.log('[admin-unified] switching to Archived');
          handleTabChange('Archived');
          showToast('Switched to Archived tab');
          break;
        case 'local_mode':
          console.log('[admin-unified] switching to Local');
          handleTabChange('Local');
          showToast('Switched to Local tab');
          break;
        case 'open_manual_orders':
          console.log('[admin-unified] opening manual orders');
          try {
            let navigated = false;
            router.push('/manual-orders').then((res) => {
              navigated = true;
              console.log('[admin-unified] router.push /manual-orders resolved', res, window.location.href);
            }).catch((err) => console.warn('[admin-unified] router.push /manual-orders failed', err));
            setTimeout(() => {
              if (!navigated) {
                console.warn('[admin-unified] router.push /manual-orders did not resolve quickly — falling back to location.href');
                try { window.location.href = '/manual-orders'; } catch (e) { console.warn('fallback location.href failed', e); }
              }
            }, 200);
          } catch (err) { console.warn('[admin-unified] router.push threw', err); }
          showToast('Opened Manual Orders');
          break;
        case 'open_manual_order_complete':
          console.log('[admin-unified] opening manual order complete');
          try {
            let navigated = false;
            router.push('/manual-order-complete').then((res) => {
              navigated = true;
              console.log('[admin-unified] router.push /manual-order-complete resolved', res, window.location.href);
            }).catch((err) => console.warn('[admin-unified] router.push /manual-order-complete failed', err));
            setTimeout(() => {
              if (!navigated) {
                console.warn('[admin-unified] router.push /manual-order-complete did not resolve quickly — falling back to location.href');
                try { window.location.href = '/manual-order-complete'; } catch (e) { console.warn('fallback location.href failed', e); }
              }
            }, 200);
          } catch (err) { console.warn('[admin-unified] router.push threw', err); }
          showToast('Opened Manual Order Complete');
          break;
        case 'open_bill':
          console.log('[admin-unified] opening bill');
          try {
            let navigated = false;
            router.push('/bill').then((res) => {
              navigated = true;
              console.log('[admin-unified] router.push /bill resolved', res, window.location.href);
            }).catch((err) => console.warn('[admin-unified] router.push /bill failed', err));
            setTimeout(() => {
              if (!navigated) {
                console.warn('[admin-unified] router.push /bill did not resolve quickly — falling back to location.href');
                try { window.location.href = '/bill'; } catch (e) { console.warn('fallback location.href failed', e); }
              }
            }, 200);
          } catch (err) { console.warn('[admin-unified] router.push threw', err); }
          showToast('Opened Bill');
          break;
        case 'open_cart':
          console.log('[admin-unified] opening cart');
          try {
            const path = (typeof window !== 'undefined' && window.location && window.location.pathname) || '';
            if (path.indexOf('/manual-order-complete') !== -1) {
              try {
                try { window.__admin_lastOpenCart = Date.now(); } catch (e) {}
                window.postMessage({ type: 'beyon:app-shortcut', payload: { action: 'open_cart' } }, '*');
                console.log('[admin-unified] posted beyon:app-shortcut open_cart to current page', { ts: Date.now(), path });
              } catch (e) {
                console.warn('[admin-unified] postMessage open_cart failed', e);
              }
              try { window.__admin_openCartPostedFlag = Date.now(); setTimeout(() => { try { window.__admin_openCartPostedFlag = null; } catch (e) {} }, 2000); } catch (e) {}
            } else {
              let navigated = false;
              router.push('/manual-order-complete?openCart=1').then((res) => {
                navigated = true;
                console.log('[admin-unified] router.push /manual-order-complete?openCart=1 resolved', res, window.location.href);
              }).catch((err) => console.warn('[admin-unified] router.push /manual-order-complete failed', err));
              setTimeout(() => {
                if (!navigated) {
                  console.warn('[admin-unified] router.push did not resolve quickly — falling back to location.href');
                  try { window.location.href = '/manual-order-complete?openCart=1'; } catch (e) { console.warn('fallback location.href failed', e); }
                }
              }, 200);
            }
          } catch (err) { console.warn('[admin-unified] router.push threw', err); }
          showToast('Opened Cart');
          break;
        case 'go_back':
          console.log('[admin-unified] go_back');
          try {
            router.back();
          } catch (err) {
            console.warn('[admin-unified] router.back failed', err);
            router.push('/');
          }
          break;
        case 'print_current':
          console.log('[admin-unified] print_current received');
          try {
            const targetId = expandedOrderId || (filteredOrders && filteredOrders[0] && filteredOrders[0]._id);
            const orderToPrint = (filteredOrders || []).find((o) => o._id === targetId) || (filteredOrders || [])[0];
            if (!orderToPrint) {
              showToast('No order available to print');
              break;
            }
            try {
              if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.printReceipt === 'function') {
                window.electronAPI.printReceipt(orderToPrint).then((res) => {
                  if (!res || !res.success) console.warn('Print failed', res && res.failureReason);
                }).catch((err) => console.warn('printReceipt failed', err));
              } else {
                const q = encodeURIComponent(JSON.stringify(orderToPrint || {}));
                window.open(`/print-receipt?order=${q}`, '_blank');
              }
            } catch (e) {
              console.error('Print action failed', e);
              showToast('Print failed');
            }
            showToast('Printing...');
          } catch (e) {
            console.warn('[admin-unified] print_current error', e);
          }
          break;
        default: break;
      }
    } catch (err) { console.warn('[admin-unified] handleMessage error', err); }
  }, [router, handleTabChange, showToast, expandedOrderId, filteredOrders]);

  // Global keyboard shortcut handler (postMessage)
  useEffect(() => {
    if (messageListenerRef.current) {
      window.removeEventListener('message', messageListenerRef.current);
    }
    messageListenerRef.current = handleMessage;
    console.log('[admin-unified] adding message listener for beyon:app-shortcut');
    window.addEventListener('message', messageListenerRef.current);

    // Replay recent shortcut if it arrived just before mount
    try {
      const last = window.__beyon_shortcut_handler && window.__beyon_shortcut_handler._last;
      if (last && last.action && Date.now() - (last.ts || 0) < 500) {
        console.log('[admin-unified] replaying recent shortcut', last);
        handleMessage({ data: { type: 'beyon:app-shortcut', payload: { action: last.action } } });
      }
    } catch (e) {
      // ignore
    }

    return () => {
      console.log('[admin-unified] removing message listener for beyon:app-shortcut');
      if (messageListenerRef.current) {
        window.removeEventListener('message', messageListenerRef.current);
      }
    };
  }, [handleMessage]);

  return { handleMessage };
};
