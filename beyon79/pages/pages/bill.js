import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { savePdfToDevice } from '../src/savePdf';
import menuData from '../data/menuData.json';
import offers from '../data/offers.json';
import { ArrowLeftIcon, ArrowDownTrayIcon, ShareIcon } from '@heroicons/react/24/outline';

// Helpers (copied from manual-order-complete)
function getActiveDiscountOfferForItem(item, menuData, offersJson) {
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
  return activeOffer;
}

function computeBillData(cartSnapshot) {
  const rewardsByOffer = {};
  for (const it of (cartSnapshot || [])) {
    if (it.isOfferReward) {
      (rewardsByOffer[it.offerId] = rewardsByOffer[it.offerId] || []).push(it);
    }
  }

  // sumCharge holds the actual charged total (used for subtotal/total)
  let sumCharge = 0;

  const lines = [];

  const baseItems = (cartSnapshot || []).filter((i) => !i.isOfferReward);
  for (const item of baseItems) {
    const linkedOffers = (offers || []).filter(o => o.active && o.type === 'buy_x_get_y' && o.base?.match?.name === item.name);
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
      // For the bill: compute how many reward items were actually applied for
      // this base item and charge only for the reward items (presentation-only).
      let rewardUnitPrice = 0;
      // total number of reward items applied for linked offers
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
      // Show the consumed line with the reward value (single amount = rewardCount * rewardUnitPrice)
      // For display: show the reward unit price (single-value). The actual
      // charged amount (for totals) is rewardCount * rewardUnitPrice and will
      // be aggregated into sumCharge. We keep amount=displayAmount for UI.
      const displayAmount = (rewardUnitPrice || 0);
      const consumedCharge = (rewardUnitPrice || 0) * Math.max(0, rewardCount || 0);
      lines.push({ desc: `${item.name} (consumed by offer)`, qty: consumed, unitPrice: rewardUnitPrice, amount: displayAmount, displayAmount, chargeAmount: consumedCharge, isOfferConsumed: true });
      // add consumed reward charge to subtotal
      sumCharge += consumedCharge;
    }
    if (leftover > 0) {
      const discountOffer = getActiveDiscountOfferForItem(item, menuData, offers);
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

  // reward lines (presentation-only): show Offer Reward entries but zero-charge
  // them in the bill summary because their value is represented on the
  // consumed base lines above. Preserve offerPrice for reference.
  for (const r of (cartSnapshot || []).filter(i => i.isOfferReward)) {
    // Offer Reward lines are shown as reference but zero-charged in the bill
    // summary (their value is presented on the consumed base lines).
    const unitPrice = r.offerPrice ?? 0;
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

  useEffect(() => {
    // try query param first
    if (router?.query?.cart) {
      try {
        const parsed = JSON.parse(Array.isArray(router.query.cart) ? router.query.cart[0] : router.query.cart);
  const cart = parsed.fullCart || parsed;
  const computed = computeBillData(cart);
  // normalize phone into meta.customerNumber for consistent use
  const rawPhone = parsed.customerNumber || parsed.phone || (parsed.customer && (parsed.customer.phone || parsed.customer.number || parsed.customer.mobile)) || '';
  const digits = String(rawPhone || '').replace(/\D/g, '');
  computed.meta = { ...parsed, customerNumber: digits };
        setBillData(computed);
        setLoading(false);
        return;
      } catch (e) {
        // fallthrough to localStorage
      }
    }

    try {
      const raw = typeof window !== 'undefined' && localStorage.getItem('manual_latest_order');
      if (raw) {
        const parsed = JSON.parse(raw);
  const computed = computeBillData(parsed.fullCart || []);
  const rawPhone = parsed.customerNumber || parsed.phone || (parsed.customer && (parsed.customer.phone || parsed.customer.number || parsed.customer.mobile)) || '';
  const digits = String(rawPhone || '').replace(/\D/g, '');
  computed.meta = { ...parsed, customerNumber: digits };
        setBillData(computed);
      }
    } catch (e) {
      console.warn('BillPage: could not load latest order', e);
    } finally {
      setLoading(false);
    }
  }, [router?.query]);

  const downloadPDF = async () => {
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const node = billRef.current || document.body;
      const canvas = await html2canvas(node, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] });
  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
  await savePdfToDevice(pdf, `bill-${Date.now()}.pdf`);
    } catch (e) {
      console.error('downloadPDF', e);
      alert('Could not generate PDF');
    }
  };

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
        if (line.qty) left.innerHTML += `<div style="font-size:11px;color:#374151;margin-top:6px">Qty: ${line.qty}</div>`;

        const right = document.createElement('div');
        right.style.textAlign = 'right';
        right.style.marginLeft = '12px';
        const qty = line.qty || 0;
        const rate = line.isOfferConsumed ? (line.displayAmount ?? 0) : (line.unitPrice ?? 0);
        const amount = (typeof line.chargeAmount === 'number' && line.chargeAmount !== 0) ? line.chargeAmount : (line.amount || (rate * qty));
        right.innerHTML = `<div style="font-size:13px;color:#111;font-weight:800">${fmt.format(amount)}</div><div style="font-size:11px;color:#6b7280;margin-top:6px">${fmt.format(rate)} × ${qty}</div>`;

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
      alert('Could not generate/share invoice. Try downloading the PNG first.');
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!billData) return <div className="p-6">No bill data found.</div>;

  return (
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
            className="bg-gray-100 text-gray-800 border border-gray-300 p-2 rounded-full hover:bg-gray-200 transition-colors"
            aria-label="Download PDF"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
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

      {/* Friendly title block below compact header */}
      <div className="max-w-3xl mx-auto mt-4 mb-3 text-center">
        <h1 className="text-gray-900 text-2xl font-semibold">Bill Details</h1>
        <p className="text-sm text-gray-500 mt-1">Preview and export the latest manual order</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4">
        <div ref={billRef} className="bg-white rounded-lg shadow-md p-4 mb-6 max-w-3xl mx-auto">
          <h2 className="text-orange-500 font-semibold mb-4">Order Summary</h2>
          {/* Show customer name/phone if available */}
          {(billData.meta && (billData.meta.customerNumber || (billData.meta.customer && (billData.meta.customer.name || billData.meta.customer.phone)))) && (
            <div className="mb-3 text-sm text-gray-600">
              {billData.meta.customer && billData.meta.customer.name ? <div className="font-medium">{billData.meta.customer.name}</div> : null}
              {billData.meta.customerNumber ? <div className="text-xs text-gray-500">Phone: {billData.meta.customerNumber}</div> : (billData.meta.customer && billData.meta.customer.phone ? <div className="text-xs text-gray-500">Phone: {billData.meta.customer.phone}</div> : null)}
            </div>
          )}

          <div className="space-y-3 mb-6">
            {billData.lines.map((line, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                <div>
                  <p className="text-gray-800 font-medium">{line.desc}</p>
              <p className="text-sm text-gray-600">Qty: {line.qty}</p>
                </div>
                <div className="text-right ml-2 min-w-[90px]">
                  {line.isOfferConsumed ? (
                    <div className="text-sm text-orange-500 font-semibold">₹{line.displayAmount ?? 0}</div>
                  ) : (
                    <>
                      <div className="text-sm text-gray-600 font-semibold">{line.qty} × ₹{line.unitPrice ?? 0}</div>
                      <div className="text-sm text-orange-500 font-semibold">₹{line.amount}</div>
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
  );
}
