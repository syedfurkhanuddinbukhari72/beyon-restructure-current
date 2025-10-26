
import { useRouter } from 'next/router';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import menuData from '../data/menuData.json';
import { getOffersRules } from '../src/localDataService';
import { applyOffersToOrder, getOrderTotal } from '../utils/offersEngine';
import { ArrowLeftIcon, ArrowDownTrayIcon, ShareIcon, PrinterIcon } from '@heroicons/react/24/outline';

const BillPrintTemplate = forwardRef(function BillPrintTemplate({ bill }, ref) {
  console.log('Bill Data:', JSON.stringify(bill, null, 2));
  const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
  const dateTime = bill?.meta?.createdAt ? new Date(bill.meta.createdAt) : new Date();
  const receiptId = bill?.meta?.orderId || bill?.meta?._id || `RC-${dateTime.getTime()}`;
  const customerName = bill?.meta?.customer?.name || bill?.meta?.customerName || '';
  const customerNumber = bill?.meta?.customerNumber || bill?.meta?.customer?.phone || '';

  return (
    <div
      ref={ref}
      style={{
        width: '280px',
        backgroundColor: '#ffffff',
        color: '#111827',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxSizing: 'border-box',
        padding: '16px',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: '12px',
        lineHeight: 1.45,
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontWeight: 700, fontSize: '18px', color: '#f97316' }}>BEYON79</span>
          <span style={{ color: '#6b7280' }}>Fresh Food &amp; Beverages</span>
        </div>
        <div style={{ textAlign: 'right', fontSize: '11px', color: '#4b5563' }}>
          <div style={{ fontWeight: 600 }}>Receipt #{receiptId}</div>
          <div>{dateTime.toLocaleString()}</div>
        </div>
      </header>

      {(customerName || customerNumber) && (
        <section style={{ marginBottom: '12px', borderTop: '1px dashed #e5e7eb', paddingTop: '10px' }}>
          <div style={{ fontWeight: 600, fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Customer</div>
          {customerName && <div style={{ fontWeight: 600 }}>{customerName}</div>}
          {customerNumber && <div style={{ color: '#4b5563' }}>{customerNumber}</div>}
        </section>
      )}

      <section style={{ borderTop: '1px dashed #e5e7eb', paddingTop: '10px' }}>
        {(bill?.lines || []).map((line, idx) => {
          const qty = line.displayQty ?? line.qty ?? 0;
          const unit = line.unitPrice ?? 0;
          const amount = typeof line.amount === 'number' ? line.amount : 0;

          if (line.isOfferPrice) {
            return (
              <div
                key={`${line.desc}-${idx}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '6px 0',
                  borderBottom: '1px solid #f3f4f6'
                }}
              >
                <div style={{ maxWidth: '60%' }}>
                  <div style={{ fontWeight: 600, color: '#111827' }}>{line.desc}</div>
                  {qty > 0 && (
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Qty: {qty}</div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: '#f97316' }}>{currency.format(amount)}</div>
                </div>
              </div>
            );
          }

          if (line.isOfferReward) {
            return (
              <div
                key={`${line.desc}-${idx}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '6px 0',
                  borderBottom: '1px solid #f3f4f6'
                }}
              >
                <div style={{ maxWidth: '60%' }}>
                  <div style={{ fontWeight: 600, color: '#111827' }}>{line.desc}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: '#10b981' }}>{currency.format(0)}</div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={`${line.desc}-${idx}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '6px 0',
                borderBottom: '1px solid #f3f4f6'
              }}
            >
              <div style={{ maxWidth: '60%' }}>
                <div style={{ fontWeight: 600, color: '#111827' }}>{line.desc}</div>
                {qty > 0 && (
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>Qty: {qty}</div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: '#111827' }}>{currency.format(amount)}</div>
                {unit > 0 && qty > 0 && amount > 0 && (
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>
                    {currency.format(unit)} × {qty}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <footer style={{ marginTop: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontWeight: 600 }}>
          <span>Subtotal</span>
          <span>{currency.format(bill?.subtotal || 0)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e5e7eb', fontWeight: 700, color: '#f97316' }}>
          <span>Total</span>
          <span>{currency.format(bill?.total || 0)}</span>
        </div>
        <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '11px', color: '#9ca3af' }}>Thank you for choosing BEYON79</div>
      </footer>
    </div>
  );
});

// Helpers (copied from manual-order-complete)
function getActiveDiscountOfferForItem(item, menuData, offersJson) {
  console.log('Finding active discount offer for item:', JSON.stringify(item, null, 2));
  let activeOffer = null;
  for (const offer of offersJson) {
    if (!offer.active) continue;
    if (offer.type === 'discount') {
      const { scope, category, item: offerItem } = offer;
      const applies =
        scope === 'all' ||
        (scope === 'category' && category && menuData[category]?.some((it) => it.name === item.name)) ||
        (scope === 'item' && offerItem === item.name);
      if (applies) {
        activeOffer = offer;
        break;
      }
    }
  }
  console.log('Active discount offer:', JSON.stringify(activeOffer, null, 2));
  return activeOffer;
}

function computeBillData(cartSnapshot, offersData) {
  const rewardsByOffer = {};
  for (const it of (cartSnapshot || [])) {
    if (it.isOfferReward) {
      (rewardsByOffer[it.offerId] = rewardsByOffer[it.offerId] || []).push(it);
    }
  }

  // sumCharge holds the actual charged total for reward lines
  let sumCharge = 0;
  for (const it of (cartSnapshot || [])) {
    if (it.isOfferReward) sumCharge += (it.offerPrice ?? 0) * (it.quantity || 0);
  }

  const lines = [];

  const baseItems = (cartSnapshot || []).filter((i) => !i.isOfferReward);
  for (const item of baseItems) {
    const linkedOffers = (offersData || []).filter(o => o.active && o.type === 'buy_x_get_y' && o.base?.match?.name === item.name);
    let groupsConsumedTotal = 0;
    for (const ofr of linkedOffers) {
      const rewardEntries = rewardsByOffer[ofr.id] || [];
      const totalAppliedRewards = rewardEntries.reduce((s, r) => s + (r.quantity || 0), 0);
      const perRewardQty = ofr.reward?.items?.[0]?.quantity || 1;
      const req = ofr.base?.quantity || 1;
      const groupsConsumed = Math.floor(totalAppliedRewards / perRewardQty) * req;
      groupsConsumedTotal += groupsConsumed;
    }
    const consumed = Math.min(item.quantity || 0, groupsConsumedTotal);
    const leftover = Math.max(0, (item.quantity || 0) - consumed);

    if (consumed > 0) {
      // For the bill/order summary only: compute rewardCount for linked offers and
      // show consumed base items at the reward value (presentation-only).
      let rewardUnitPrice = 0;
      let rewardCount = 0;
      for (const ofr of linkedOffers) {
        const rewardEntries = rewardsByOffer[ofr.id] || [];
        const totalAppliedRewards = rewardEntries.reduce((s, r) => s + (r.quantity || 0), 0);
        rewardCount += totalAppliedRewards;
        const rewardDef = ofr.reward?.items?.[0];
        if (!rewardUnitPrice && rewardDef && typeof rewardDef.price === 'number') {
          rewardUnitPrice = rewardDef.price;
        }
      }
      // For display: show the reward unit price (single-value). Consumed items do not add to the charged subtotal.
      const displayAmount = (rewardUnitPrice || 0);
      lines.push({ desc: `${item.name} (consumed by offer)`, qty: consumed, unitPrice: rewardUnitPrice, amount: displayAmount, displayAmount, chargeAmount: 0, isOfferConsumed: true });
    }
    if (leftover > 0) {
      const discountOffer = getActiveDiscountOfferForItem(item, menuData, offersData);
      let unitPrice = item.price;
      if (discountOffer) {
        const { type, amount } = discountOffer;
        if (type === 'percent') unitPrice = item.price - Math.round((item.price * amount) / 100);
        else if (type === 'flat') unitPrice = item.price - amount;
        if (unitPrice < 0) unitPrice = 0;
      }
      lines.push({ desc: item.name, qty: leftover, unitPrice, amount: unitPrice * leftover });
      // Add leftover base charges to the charged subtotal
      sumCharge += unitPrice * leftover;
    }
  }

  // reward lines (show as Offer Reward entries). For the order summary we want these to
  // appear but not add to the billed total (they are already represented on the consumed
  // base lines above). So present them with unitPrice 0 and amount 0 while keeping
  // the offerPrice available in the description if needed.
  for (const r of (cartSnapshot || []).filter(i => i.isOfferReward)) {
    const unitPrice = r.offerPrice ?? 0;
    // Offer Reward lines are reference-only here and zero-charged.
    lines.push({ desc: `${r.name} (Offer Reward)`, qty: r.quantity || 0, unitPrice: 0, amount: 0, chargeAmount: 0, isOfferReward: true, offerPrice: unitPrice });
  }

  const subtotal = sumCharge;
  return { lines, subtotal, total: sumCharge };
}

export default function BillPage() {
  const router = useRouter();
  const [billData, setBillData] = useState(null);
  const [loading, setLoading] = useState(true);
  const billRef = useRef(null);
  const printTemplateRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [printers, setPrinters] = useState([]);
  const [printerModalOpen, setPrinterModalOpen] = useState(false);
  const [printerLoading, setPrinterLoading] = useState(false);
  const [selectedPrinterIdx, setSelectedPrinterIdx] = useState(null);
  const [printerError, setPrinterError] = useState(null);
  const [printOrder, setPrintOrder] = useState(null);
  const [rememberPrinter, setRememberPrinter] = useState(true);
  const [preferredPrinterName, setPreferredPrinterName] = useState(null);
  const [printMethod, setPrintMethod] = useState('spooler'); // 'spooler' or 'tcp-escpos'
  const [escposHost, setEscposHost] = useState('');
  const [escposPort, setEscposPort] = useState(9100);
  const [rememberEscpos, setRememberEscpos] = useState(false);
  const [toast, setToast] = useState(null); // {type:'success'|'error', message}

  // Function to update bill data
  const updateBillData = useCallback(async (cartData) => {
    try {
      const offersData = await getOffersRules();
      const cart = cartData.fullCart || cartData;
      const computed = computeBillData(cart, offersData);
      const rawPhone = cartData.customerNumber || cartData.phone || (cartData.customer && (cartData.customer.phone || cartData.customer.number || cartData.customer.mobile)) || '';
      const digits = String(rawPhone || '').replace(/\D/g, '');
      computed.meta = { ...cartData, customerNumber: digits };
      setBillData(computed);
      return computed;
    } catch (e) {
      console.error('Error updating bill data:', e);
      return null;
    }
  }, []);

  // Load latest order from localStorage on mount
  useEffect(() => {
    const loadFromLocalStorage = () => {
      try {
        const savedOrder = localStorage.getItem('manual_latest_order');
        if (savedOrder) {
          const cartData = JSON.parse(savedOrder);
          console.log('Loaded order from localStorage:', cartData);
          updateBillData(cartData);
        } else {
          console.log('No saved order found in localStorage');
        }
      } catch (err) {
        console.error('Error loading order from localStorage:', err);
      } finally {
        setLoading(false);
      }
    };

    loadFromLocalStorage();

    // Also listen for storage events to update when order changes in another tab
    const handleStorageChange = (e) => {
      if (e.key === 'manual_latest_order') {
        try {
          const cartData = JSON.parse(e.newValue || '{}');
          console.log('Order updated from storage event:', cartData);
          updateBillData(cartData);
        } catch (err) {
          console.error('Error parsing cart data from storage:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [updateBillData]);

  // Function to load latest order
  const loadLatestOrder = useCallback(() => {
    try {
      // Try query param first
      if (router?.query?.cart) {
        try {
          const parsed = JSON.parse(Array.isArray(router.query.cart) ? router.query.cart[0] : router.query.cart);
          console.log('Loaded order from query param:', parsed);
          updateBillData(parsed);
          setLoading(false);
          
          // Save to localStorage for future reference
          if (typeof window !== 'undefined') {
            localStorage.setItem('manual_latest_order', JSON.stringify(parsed));
          }
          
          // Check if print is requested
          if (router.query.print === 'true') {
            setTimeout(() => printReceipt(), 500);
          }
          return true;
        } catch (e) {
          console.warn('Failed to parse cart from query param:', e);
        }
      }

      // Try localStorage
      try {
        const raw = typeof window !== 'undefined' && localStorage.getItem('manual_latest_order');
        if (raw) {
          const parsed = JSON.parse(raw);
          console.log('Loaded order from localStorage:', parsed);
          updateBillData(parsed);
          
          // Check if print is requested
          if (router.query.print === 'true') {
            setTimeout(() => printReceipt(), 500);
          }
          return true;
        } else {
          console.log('No manual_latest_order found in localStorage');
        }
      } catch (e) {
        console.warn('Failed to load order from localStorage:', e);
      }
      
      // Try fetching from orders history as fallback
      try {
        const orders = JSON.parse(localStorage.getItem('local_orders') || '[]');
        if (orders.length > 0) {
          const latestOrder = orders.sort((a, b) => 
            new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
          )[0];
          
          if (latestOrder) {
            console.log('Loaded latest order from orders history:', latestOrder);
            updateBillData(latestOrder);
            // Save to manual_latest_order for consistency
            localStorage.setItem('manual_latest_order', JSON.stringify(latestOrder));
            return true;
          }
        }
      } catch (e) {
        console.warn('Failed to load from orders history:', e);
      }
      
      return false;
    } finally {
      setLoading(false);
    }
  }, [router.query, updateBillData]);

  // Initial load
  useEffect(() => {
    loadLatestOrder();
    
    // Set up a refresh button handler
    const handleRefresh = () => loadLatestOrder();
    
    // Add refresh button to the page
    const refreshButton = document.createElement('button');
    refreshButton.textContent = '🔄 Refresh Bill';
    refreshButton.style.position = 'fixed';
    refreshButton.style.top = '10px';
    refreshButton.style.right = '10px';
    refreshButton.style.padding = '8px 16px';
    refreshButton.style.backgroundColor = '#4CAF50';
    refreshButton.style.color = 'white';
    refreshButton.style.border = 'none';
    refreshButton.style.borderRadius = '4px';
    refreshButton.style.cursor = 'pointer';
    refreshButton.style.zIndex = '1000';
    refreshButton.onclick = handleRefresh;
    
    document.body.appendChild(refreshButton);
    
    // Clean up
    return () => {
      document.body.removeChild(refreshButton);
    };
  }, [router?.query]);

  const captureTemplate = useCallback(async () => {
    if (!printTemplateRef.current) {
      throw new Error('Print template is not ready');
    }
    if (document.fonts?.ready) await document.fonts.ready;
    const html2canvas = (await import('html2canvas')).default;
    return html2canvas(printTemplateRef.current, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });
  }, []);

  const downloadPDF = useCallback(async () => {
    try {
      setGenerateError(null);
      setIsGenerating(true);
      let canvas;
      try {
        canvas = await captureTemplate();
      } catch (err) {
        // If the html2canvas chunk failed to load (ChunkLoadError), fallback
        // to the print-receipt page which uses a server/client-side fallback.
        const msg = String(err && err.message ? err.message : err);
        console.warn('captureTemplate failed, falling back to print-receipt:', err);
        try {
          // Build a minimal order payload similar to printReceipt
          const order = {
            id: (billData?.meta && (billData.meta.orderId || billData.meta._id)) || `manual-${Date.now()}`,
            shopName: 'BEYON79',
            items: (billData?.lines || []).map(l => ({ name: l.desc, qty: l.qty || 0, price: l.unitPrice || 0 })),
            subtotal: billData?.subtotal || 0,
            total: billData?.total || 0,
            meta: billData?.meta || {},
          };
          const q = encodeURIComponent(JSON.stringify(order || {}));
          // Open fallback print page in a new tab/window
          window.open(`/print-receipt?order=${q}`, '_blank');
          setGenerateError('Could not generate PDF locally (html2canvas failed); opened print preview fallback.');
          try { setToast({ type: 'error', message: 'Could not generate PDF locally — opened fallback print preview.' }); } catch (e) {}
        } catch (e) {
          setGenerateError('Could not generate PDF and fallback preview failed.');
          try { setToast({ type: 'error', message: 'Failed to generate PDF and preview fallback.' }); } catch (e) {}
        } finally {
          setIsGenerating(false);
        }
        return;
      }
      const { jsPDF } = await import('jspdf');
      const imgData = canvas.toDataURL('image/png');
      const pageWidthMm = 58;
      const pageHeightMm = (canvas.height / canvas.width) * pageWidthMm;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pageWidthMm, pageHeightMm] });
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidthMm, pageHeightMm);
      pdf.save(`beyon79-bill-${Date.now()}.pdf`);
    } catch (error) {
      console.error('downloadPDF failed', error);
      setGenerateError('Could not generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [captureTemplate]);

  const share = async () => {
    // Build the receipt PNG (reuse the off-screen builder logic)
    try {
      const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
      const now = new Date();
      const receiptNumber = `RC-${now.getTime()}`;

      const wrapper = document.createElement('div');
      wrapper.className = 'receipt-offscreen';
      wrapper.style.position = 'fixed';
      wrapper.style.left = '-9999px';
      wrapper.style.top = '0';
      wrapper.style.background = '#ffffff';
      wrapper.style.boxSizing = 'border-box';
      wrapper.style.padding = '12px';
      wrapper.style.overflow = 'hidden';
      const vw = (window && window.innerWidth) ? window.innerWidth : 360;
      const vh = (window && window.innerHeight) ? window.innerHeight : 640;
      wrapper.style.width = `${vw}px`;
      wrapper.style.minWidth = `${vw}px`;
      wrapper.style.height = `${vh}px`;
      wrapper.style.minHeight = `${vh}px`;
      wrapper.style.maxWidth = '100%';
      wrapper.style.margin = '0';
      wrapper.style.boxShadow = 'none';

      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      header.style.borderBottom = '1px solid #e8e8e8';
      header.style.paddingBottom = '10px';
      header.style.marginBottom = '10px';
      header.style.gap = '8px';
      header.innerHTML = `<div style="display:flex;flex-direction:column;"><span style=\"color:#fb923c;margin:0;font-size:16px;font-weight:700;line-height:1\">BEYON79</span><span style=\"font-size:11px;color:#6b7280;margin-top:4px\">Thank you for your order</span></div>`;
      const hdrRight = document.createElement('div');
      hdrRight.style.fontSize = '12px';
      hdrRight.style.color = '#374151';
      hdrRight.style.textAlign = 'right';
      hdrRight.innerHTML = `<div style="font-weight:600;color:#374151">Receipt # ${receiptNumber}</div><div style="margin-top:4px;color:#6b7280;font-size:12px">${now.toLocaleString()}</div>`;
      header.appendChild(hdrRight);
      wrapper.appendChild(header);

      // customer block
      const cust = document.createElement('div');
      cust.style.marginBottom = '8px';
      cust.innerHTML = `<div style="font-size:12px;color:#6b7280;font-weight:600">Customer</div>`;
      const customerName = (billData.meta && billData.meta.customer && billData.meta.customer.name) || '';
      const customerAddress = (billData.meta && billData.meta.customer && billData.meta.customer.address) || '';
      if (customerName) cust.innerHTML += `<div style="font-size:13px;color:#111;margin-top:4px">${customerName}</div>`;
      if (customerAddress) cust.innerHTML += `<div style="font-size:12px;color:#6b7280;margin-top:2px">${customerAddress}</div>`;
      wrapper.appendChild(cust);

      const itemsContainer = document.createElement('div');
      itemsContainer.style.width = '100%';
      (billData.lines || []).forEach((line) => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'flex-start';
        row.style.padding = '8px 0';
        row.style.borderBottom = '1px solid #f3f4f6';

        const left = document.createElement('div');
        left.style.flex = '1';
        left.style.minWidth = '0';
        left.innerHTML = `<div style="font-size:13px;color:#111;font-weight:700">${line.desc}</div>`;
        if (qty && !line.hideQty && !line.isOfferPrice && !line.isOfferReward) {
          left.innerHTML += `<div style="font-size:11px;color:#374151;margin-top:6px">Qty: ${qty}</div>`;
        }

        const right = document.createElement('div');
        right.style.textAlign = 'right';
        right.style.marginLeft = '12px';
        const qty = line.qty || 0;
        const rate = line.isOfferConsumed ? (line.displayAmount ?? 0) : (line.unitPrice ?? 0);
        const amount = (typeof line.chargeAmount === 'number' && line.chargeAmount !== 0) ? line.chargeAmount : (line.amount || (rate * qty));
        const amountColor = line.isOfferPrice ? '#f97316' : (line.isOfferReward ? '#10b981' : '#111');
        right.innerHTML = `<div style="font-size:13px;color:${amountColor};font-weight:800">${fmt.format(amount)}</div>`;
        if (rate > 0 && qty > 0 && !line.hideUnitCalc && !line.isOfferPrice && !line.isOfferReward) {
          right.innerHTML += `<div style="font-size:11px;color:#6b7280;margin-top:6px">${fmt.format(rate)} × ${qty}</div>`;
        }

        row.appendChild(left);
        row.appendChild(right);
        itemsContainer.appendChild(row);
      });
      wrapper.appendChild(itemsContainer);

      const totals = document.createElement('div');
      totals.style.marginTop = '12px';
      totals.style.fontSize = '13px';
      totals.innerHTML = `<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style=\"color:#111;font-weight:700\">Subtotal</span><strong style=\"font-weight:800;color:#111\">${fmt.format(billData.subtotal || 0)}</strong></div><div style=\"display:flex;justify-content:space-between;border-top:1px solid #eee;padding-top:10px\"><span style=\"font-weight:800;color:#fb923c\">Total</span><span style=\"font-weight:800;color:#fb923c\">${fmt.format(billData.total || 0)}</span></div>`;
      wrapper.appendChild(totals);

      document.body.appendChild(wrapper);
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const html2canvas = (await import('html2canvas')).default;
      const scale = Math.max(2, window.devicePixelRatio || 1);
      const canvas = await html2canvas(wrapper, { scale, useCORS: true, backgroundColor: '#ffffff' });

      // convert to blob/file
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
      const file = new File([blob], `bill-${Date.now()}.png`, { type: 'image/png' });

      // Preferred flow: try Web Share API with files first so native share sheet (WhatsApp) can receive the PNG.
      // This works well on Android where WhatsApp is a share target and accepts files.
      if (navigator?.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        try {
          await navigator.share({ files: [file], title: 'BEYON79 Invoice', text: `Hi! Here is your BEYON79 invoice (Receipt ${receiptNumber}).` });
          wrapper.remove();
          return;
        } catch (e) {
          console.warn('Web share with files failed', e);
          // fallthrough to wa.me + download fallback
        }
      }

      // If Web Share isn't available or failed, and we have a customer number, open wa.me with text and download the PNG
      const custDigits = (billData?.meta && billData.meta.customerNumber) || '';
      const digits = String(custDigits || '').replace(/\D/g, '');
      let waNumber = '';
      if (digits.length === 10) waNumber = '91' + digits; // assume India if only 10 digits
      else if (digits.length >= 11) waNumber = digits;

      if (waNumber) {
        const msg = encodeURIComponent(`Hi! Here is your BEYON79 invoice (Receipt ${receiptNumber}).\n\nPlease find the attached invoice (downloaded).`);
        const waUrl = `https://wa.me/${waNumber}?text=${msg}`;
        window.open(waUrl, '_blank');

        // trigger PNG download so operator can attach it manually in WhatsApp
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bill-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        wrapper.remove();
        return;
      }

      // Final fallback: download and alert
      const urlFallback = URL.createObjectURL(blob);
      const a2 = document.createElement('a');
      a2.href = urlFallback;
      a2.download = `bill-${Date.now()}.png`;
      document.body.appendChild(a2);
      a2.click();
      a2.remove();
      URL.revokeObjectURL(urlFallback);
      wrapper.remove();
      alert('Invoice downloaded. If the customer uses WhatsApp, attach the downloaded PNG in a chat.');
    } catch (err) {
      console.error('share failed', err);
  alert('Could not generate or share the invoice. Try saving it locally first.');
    }
  };

  const printReceipt = useCallback(async () => {
    // Open printer selection modal. Build and stash the order for the modal to use.
    try {
      setGenerateError(null);
      const order = {
        id: (billData?.meta && (billData.meta.orderId || billData.meta._id)) || `manual-${Date.now()}`,
        shopName: 'BEYON79',
        items: (billData?.lines || []).map(l => ({ name: l.desc, qty: l.qty || 0, price: l.unitPrice || 0 })),
        subtotal: billData?.subtotal || 0,
        total: billData?.total || 0,
        meta: billData?.meta || {},
      };
      setPrintOrder(order);
      // If in Electron, fetch printers; otherwise open modal with no printers
      if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.listPrinters === 'function') {
        setPrinterLoading(true);
        setPrinterError(null);
        // load any saved escpos prefs
        try {
          const storedHost = typeof window !== 'undefined' ? window.localStorage.getItem('preferredEscposHost') : null;
          const storedPort = typeof window !== 'undefined' ? window.localStorage.getItem('preferredEscposPort') : null;
          const storedRememberEsc = typeof window !== 'undefined' ? window.localStorage.getItem('rememberEscpos') : null;
          if (storedHost) setEscposHost(storedHost);
          if (storedPort) setEscposPort(Number(storedPort) || 9100);
          setRememberEscpos(storedRememberEsc === 'true');
        } catch (e) {}
        try {
          const res = await window.electronAPI.listPrinters();
          if (res && res.success && Array.isArray(res.printers)) {
            const list = res.printers || [];
            setPrinters(list);
            // try to preselect preferred printer from localStorage first
            const stored = typeof window !== 'undefined' ? window.localStorage.getItem('preferredPrinterName') : null;
            if (stored) {
              setPreferredPrinterName(stored);
              const idx = list.findIndex(p => (p.name && p.name === stored) || (p.displayName && p.displayName === stored) || (p.deviceName && p.deviceName === stored));
              if (idx >= 0) {
                setSelectedPrinterIdx(idx);
              } else {
                const defIdx = list.findIndex(p => p.isDefault) || 0;
                setSelectedPrinterIdx(defIdx >= 0 ? defIdx : 0);
              }
            } else {
              // preselect default printer if present
              const defIdx = list.findIndex(p => p.isDefault) || 0;
              setSelectedPrinterIdx(defIdx >= 0 ? defIdx : 0);
            }
          } else {
            setPrinters([]);
            setPrinterError(res && res.error ? String(res.error) : 'No printers available');
            setSelectedPrinterIdx(null);
          }
        } catch (e) {
          setPrinters([]);
          setPrinterError(String(e));
          setSelectedPrinterIdx(null);
        } finally {
          setPrinterLoading(false);
          setPrinterModalOpen(true);
        }
      } else {
        // Not an Electron environment: open modal which will show fallback to PDF
        setPrinters([]);
        setSelectedPrinterIdx(null);
        setPrinterModalOpen(true);
      }
    } catch (err) {
      console.error('printReceipt error', err);
      setGenerateError(err?.message || String(err));
    }
  }, [billData, downloadPDF]);

  // Auto-dismiss toast after a short TTL
  useEffect(() => {
    if (!toast) return;
    const ttl = 3000;
    const t = setTimeout(() => setToast(null), ttl);
    return () => clearTimeout(t);
  }, [toast]);

  const previewReceipt = useCallback(async () => {
    try {
      setIsPreviewing(true);
      setGenerateError(null);
      const order = {
        id: (billData?.meta && (billData.meta.orderId || billData.meta._id)) || `manual-${Date.now()}`,
        shopName: 'BEYON79',
        items: (billData?.lines || []).map(l => ({ name: l.desc, qty: l.qty || 0, price: l.unitPrice || 0 })),
        subtotal: billData?.subtotal || 0,
        total: billData?.total || 0,
        meta: billData?.meta || {},
      };

      if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.printReceipt === 'function') {
        // ask the main process to open a preview window (no system print)
        const res = await window.electronAPI.printReceipt(order, { preview: true, previewWidth: 384 });
        // Optionally inspect res for errors
        if (!(res && res.success)) {
          console.warn('Preview request returned:', res);
        }
      } else {
        // Not in Electron: fallback to generating a PDF preview
        await downloadPDF();
      }
    } catch (err) {
      console.error('previewReceipt error', err);
      setGenerateError(String(err));
    } finally {
      setIsPreviewing(false);
    }
  }, [billData, downloadPDF]);

  const doPrintToSelected = useCallback(async () => {
    if (!printOrder) return;
    setIsPrinting(true);
    setPrinterError(null);
    setPrintOrder((p) => p); // keep
    try {
      if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.printReceipt === 'function') {
        if (printMethod === 'tcp-escpos') {
          // direct network ESC/POS printing
          if (!escposHost) {
            setPrinterError('ESC/POS host is required');
            setIsPrinting(false);
            return;
          }
          const res = await window.electronAPI.printReceipt(printOrder, { method: 'tcp-escpos', printerConfig: { host: escposHost, port: Number(escposPort || 9100) } });
          const ok = res && res.success;
          const reason = res && (res.failureReason || res.error || res.message || null);
          if (ok) {
            setToast({ type: 'success', message: 'Printed to ESC/POS printer' });
            // persist escpos config if requested
            try {
              if (rememberEscpos && typeof window !== 'undefined') {
                window.localStorage.setItem('preferredEscposHost', escposHost);
                window.localStorage.setItem('preferredEscposPort', String(escposPort || 9100));
                window.localStorage.setItem('rememberEscpos', 'true');
              }
            } catch (e) {}
            // clear modal state
            setPrinterModalOpen(false);
            setPrintOrder(null);
          } else {
            const pretty = reason ? String(reason) : 'Unknown ESC/POS error';
            setPrinterError(pretty);
            setToast({ type: 'error', message: `ESC/POS print failed: ${pretty}` });
          }
        } else {
          // spooler (OS dialog) path
          const selected = (printers && selectedPrinterIdx != null) ? printers[selectedPrinterIdx] : null;
          const printerName = selected ? (selected.name || selected.deviceName || selected.displayName) : null;
          const res = await window.electronAPI.printReceipt(printOrder, { silent: false, printerName });
          const ok = res && res.success;
          const reason = res && (res.failureReason || res.error || res.message || null);
          if (ok) {
            setToast({ type: 'success', message: 'Print job queued successfully' });
            // success: close modal and clear
            setPrinterModalOpen(false);
            setPrinters([]);
            setSelectedPrinterIdx(null);
            setPrintOrder(null);
            // persist the chosen printer if requested
            try {
              if (rememberPrinter && printerName && typeof window !== 'undefined') {
                window.localStorage.setItem('preferredPrinterName', printerName);
                setPreferredPrinterName(printerName);
              }
            } catch (e) {}
          } else {
            const pretty = reason ? String(reason) : 'Unknown printer error';
            setPrinterError(pretty);
            setToast({ type: 'error', message: `Print failed: ${pretty}` });
          }
        }
      } else {
        // Not in Electron: fallback to PDF
        await downloadPDF();
        setPrinterModalOpen(false);
      }
    } catch (e) {
      setPrinterError(String(e));
    } finally {
      setIsPrinting(false);
    }
  }, [printOrder, printers, selectedPrinterIdx, downloadPDF]);

  // Listen for app-shortcut messages so double-press 'p' triggers printing
  useEffect(() => {
    const handleMessage = (e) => {
      try {
        const d = e.data;
        if (!d || d.type !== 'beyon:app-shortcut') return;
        const payload = d.payload || {};
        const action = payload.action;
        if (action === 'print_current') {
          console.log('[bill] received print_current shortcut — invoking printReceipt');
          try {
            // printReceipt is a stable callback defined above
            printReceipt().catch((err) => console.warn('[bill] printReceipt failed', err));
          } catch (err) {
            console.warn('[bill] error invoking printReceipt', err);
          }
        }
      } catch (err) {
        // ignore
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [printReceipt]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!billData) return <div className="p-6">No bill data found.</div>;

  return (
    <>
      <div className="min-h-screen bg-white flex flex-col">
      {/* Compact header: icons only */}
      <div className="bg-white shadow-sm border-b border-gray-100 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="bg-gray-100 text-gray-800 border border-gray-300 p-2 rounded-full hover:bg-gray-200 transition-colors"
            aria-label="Back"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadPDF}
            disabled={isGenerating}
            className={`bg-gray-100 text-gray-800 border border-gray-300 p-2 rounded-full transition-colors ${isGenerating ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-200'}`}
            aria-label="Download PDF"
            aria-busy={isGenerating}
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
          </button>
          <button
            onClick={printReceipt}
            disabled={isPrinting}
            className={`bg-gray-100 text-gray-800 border border-gray-300 p-2 rounded-full transition-colors ${isPrinting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-orange-500 hover:text-white'}`}
            aria-label="Print"
            aria-busy={isPrinting}
          >
            {isPrinting ? (
              <PrinterIcon className="h-5 w-5 animate-spin" />
            ) : (
              <PrinterIcon className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={previewReceipt}
            disabled={isPreviewing}
            className={`bg-white text-gray-800 border border-gray-300 p-2 rounded-full transition-colors ${isPreviewing ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-200'}`}
            aria-label="Preview"
            aria-busy={isPreviewing}
            title="Open a thermal-width preview (desktop only)"
          >
            {isPreviewing ? 'Previewing…' : 'Preview'}
          </button>
          <button
            onClick={share}
            className="bg-gray-100 text-gray-800 border border-gray-300 p-2 rounded-full hover:bg-gray-200 transition-colors"
            aria-label="Share"
          >
            <ShareIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {(isGenerating || generateError) && (
        <div className="px-4 py-2 text-center">
          {isGenerating && <p className="text-xs text-gray-500">Preparing PDF…</p>}
          {generateError && <p className="text-xs text-red-500 mt-1">{generateError}</p>}
        </div>
      )}

      {/* Friendly title block below compact header */}
      <div className="max-w-3xl mx-auto mt-4 mb-3 text-center">
        <h1 className="text-gray-900 text-2xl font-semibold">Bill Details</h1>
  <p className="text-sm text-gray-600 mt-1">Preview and export the latest manual order</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4">
        <div ref={billRef} className="bg-white rounded-lg shadow-md p-4 mb-6 max-w-3xl mx-auto">
          <h2 className="text-orange-500 font-semibold mb-4">Order Summary</h2>
          {/* Show customer name/phone if available */}
          {(billData.meta && (billData.meta.customerNumber || (billData.meta.customer && (billData.meta.customer.name || billData.meta.customer.phone)))) && (
            <div className="mb-3 text-sm text-gray-600">
              {billData.meta.customer && billData.meta.customer.name ? <div className="font-medium">{billData.meta.customer.name}</div> : null}
              {billData.meta.customerNumber ? <div className="text-xs text-gray-600">Phone: {billData.meta.customerNumber}</div> : (billData.meta.customer && billData.meta.customer.phone ? <div className="text-xs text-gray-600">Phone: {billData.meta.customer.phone}</div> : null)}
            </div>
          )}

          <div className="space-y-3 mb-6">
            {billData.lines.map((line, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                <div>
                  <p className="text-gray-800 font-medium">{line.desc}</p>
                  {(() => {
                    const qty = line.displayQty ?? line.qty ?? 0;
                    if (qty > 0 && !line.isOfferReward && !line.hideQty) {
                      return <p className="text-sm text-gray-600">Qty: {qty}</p>;
                    }
                    return null;
                  })()}
                </div>
                <div className="text-right ml-2 min-w-[90px]">
                  {line.isOfferReward ? (
                    <p className="text-sm font-semibold text-[#10b981]">₹0</p>
                  ) : (
                    <>
                      <p className={`text-sm font-semibold ${line.isOfferPrice ? 'text-orange-500' : 'text-gray-800'}`}>₹{line.amount}</p>
                      {line.unitPrice > 0 && (line.displayQty ?? line.qty ?? 0) > 0 && !line.hideUnitCalc && !line.isOfferPrice && !line.isOfferReward && !line.isOfferConsumed && (
                        <p className="text-xs text-gray-500">₹{line.unitPrice} × {line.displayQty ?? line.qty ?? 0}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-gray-800">
              <span className="font-medium">Subtotal</span>
              <span className="font-semibold">₹{billData.subtotal}</span>
            </div>
            <div className="flex justify-between items-center text-gray-800 pt-2 border-t border-gray-200">
              <span className="font-bold text-orange-500">Total</span>
              <span className="font-bold text-lg text-orange-500">₹{billData.total}</span>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Printer selection modal (Option B) */}
      {printerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-4">
            <h3 className="text-lg font-semibold">Select Printer</h3>
            <p className="text-sm text-gray-600 mt-1">Choose a printing method and destination. If none are available you can save as PDF.</p>

            <div className="mt-3">
              <label className="flex items-center gap-2">
                <input type="radio" name="printMethod" value="spooler" checked={printMethod === 'spooler'} onChange={() => setPrintMethod('spooler')} />
                <span className="text-sm">Spooler (OS dialog)</span>
              </label>
              <label className="flex items-center gap-2 mt-2">
                <input type="radio" name="printMethod" value="tcp-escpos" checked={printMethod === 'tcp-escpos'} onChange={() => setPrintMethod('tcp-escpos')} />
                <span className="text-sm">ESC/POS (Network)</span>
              </label>
            </div>

            <div className="mt-4">
              {printerLoading ? (
                <div className="text-sm text-gray-600">Loading printers…</div>
              ) : (printers && printers.length > 0) ? (
                <div className="space-y-2 max-h-40 overflow-auto">
                  {printers.map((p, idx) => (
                    <label key={idx} className={`flex items-center gap-3 p-2 border rounded ${selectedPrinterIdx === idx ? 'border-orange-400 bg-orange-50' : 'border-gray-100'}`}>
                      <input type="radio" name="printer" checked={selectedPrinterIdx === idx} onChange={() => setSelectedPrinterIdx(idx)} />
                      <div className="flex-1 text-sm">
                        <div className="font-medium">{p.name || p.deviceName || p.displayName}</div>
                        <div className="text-xs text-gray-500">{p.isDefault ? 'Default printer' : (p.description || '')}</div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-600">No printers found on this device.</div>
              )}
              {printerError ? <div className="text-xs text-red-500 mt-2">{printerError}</div> : null}
            </div>

            {printMethod === 'tcp-escpos' && (
              <div className="mt-3">
                <div className="text-sm font-medium mb-2">ESC/POS Network Settings</div>
                <div className="flex gap-2">
                  <input className="flex-1 p-2 border rounded" placeholder="Printer IP or Host" value={escposHost} onChange={(e) => setEscposHost(e.target.value)} />
                  <input className="w-20 p-2 border rounded" placeholder="9100" value={escposPort} onChange={(e) => setEscposPort(e.target.value)} />
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        setPrinterError(null);
                        setToast(null);
                        if (!escposHost) {
                          setPrinterError('Enter ESC/POS host');
                          return;
                        }
                        const res = (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.testEscposConnection === 'function') ? await window.electronAPI.testEscposConnection(escposHost, Number(escposPort || 9100), 3000) : { success: false, failureReason: 'No test API' };
                        if (res && res.success) {
                          setToast({ type: 'success', message: `Connection to ${escposHost}:${escposPort} OK` });
                        } else {
                          const reason = res && (res.failureReason || res.error) ? String(res.failureReason || res.error) : 'Unknown';
                          setToast({ type: 'error', message: `Connection failed: ${reason}` });
                        }
                      } catch (e) {
                        setToast({ type: 'error', message: `Connection failed: ${String(e)}` });
                      }
                    }}
                    className="px-3 py-2 rounded border bg-gray-100"
                  >
                    Test Connection
                  </button>
                </div>
                <label className="flex items-center gap-2 mt-2 text-sm">
                  <input type="checkbox" checked={rememberEscpos} onChange={(e) => setRememberEscpos(!!e.target.checked)} />
                  <span>Remember ESC/POS settings</span>
                </label>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={rememberPrinter} onChange={(e) => setRememberPrinter(!!e.target.checked)} />
                <span>Remember this printer</span>
              </label>
              <div className="text-xs text-gray-500">Preferred: {preferredPrinterName || '—'}</div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { setPrinterModalOpen(false); setPrinterError(null); }} className="px-3 py-2 rounded border">Cancel</button>
              <button onClick={async () => { await downloadPDF(); setPrinterModalOpen(false); }} className="px-3 py-2 rounded border bg-gray-100">Save as PDF</button>
              <button onClick={doPrintToSelected} disabled={isPrinting || (printers && printers.length === 0 && printMethod === 'spooler')} className="px-3 py-2 rounded bg-orange-500 text-white disabled:opacity-60">{isPrinting ? 'Printing…' : 'Print'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, padding: '10px 14px', background: toast.type === 'success' ? '#16a34a' : '#dc2626', color: 'white', borderRadius: 8, zIndex: 9999 }}>
          {toast.message}
        </div>
      )}

      <div className="fixed -left-[9999px] top-0 pointer-events-none" aria-hidden="true">
        <BillPrintTemplate ref={printTemplateRef} bill={billData} />
      </div>
      {/* Toast overlay */}
      {toast && (
        <div aria-live="polite" className="fixed right-4 bottom-4 z-50">
          <div className={`max-w-xs w-full rounded-md shadow-lg ring-1 ring-black/5 px-4 py-3 ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
            <div className="text-sm">{toast.message}</div>
          </div>
        </div>
      )}
    </>
  );
}
