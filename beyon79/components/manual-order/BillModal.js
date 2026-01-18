import React from 'react';

const BillModal = ({
  open,
  billRef,
  billData,
  billSource,
  paperFormat,
  downloading,
  onChangeBillSource,
  onChangePaperFormat,
  onDownload,
  onPrint,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div ref={billRef} className={`printable-bill ${paperFormat === 'thermal-80' ? 'thermal-80' : paperFormat === 'a4' ? 'a4' : ''} relative w-full md:w-[540px] max-h-[90vh] bg-white rounded-t-2xl md:rounded-lg shadow-2xl overflow-auto p-4`} style={{ borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-lg text-orange-500">Bill Preview</h3>
            <div className="text-xs text-gray-500">{new Date().toLocaleString()}</div>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <span className="hidden sm:inline">Source:</span>
              <select value={billSource} onChange={(e) => onChangeBillSource(e.target.value)} className="border border-gray-200 rounded px-2 py-1 text-sm bg-white">
                <option value="cart">Current Cart</option>
                <option value="latest">Latest Saved</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <span className="hidden sm:inline">Paper:</span>
              <select value={paperFormat} onChange={(e) => onChangePaperFormat(e.target.value)} className="border border-gray-200 rounded px-2 py-1 text-sm bg-white">
                <option value="auto">Auto</option>
                <option value="thermal-80">Thermal 80mm</option>
                <option value="a4">A4</option>
              </select>
            </label>
            <button className="px-3 py-1 rounded bg-gray-100 text-sm" onClick={onClose}>Close</button>
            <button className="px-3 py-1 rounded bg-gray-100 text-sm" onClick={onPrint}>Print</button>
            <button className="px-3 py-1 rounded bg-green-600 text-white" onClick={onDownload}>{downloading ? 'Working...' : 'Download PDF'}</button>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          <div className="pb-3">
            {billData.lines.map((l, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{l.desc}</div>
                  <div className="text-xs text-gray-500">{l.isOfferReward ? 'Offer Reward' : l.isOfferConsumed ? 'Consumed by offer' : ''}</div>
                </div>
                <div className="text-right ml-2 min-w-[90px]">
                  {l.isOfferConsumed ? (
                    <div className="text-sm text-orange-500 font-semibold">₹{l.displayAmount ?? 0}</div>
                  ) : (
                    <>
                      <div className="text-sm font-semibold">{l.qty} × ₹{l.unitPrice}</div>
                      <div className="text-sm text-orange-500 font-semibold">₹{l.amount}</div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3">
            <div className="flex items-center justify-between py-1"><span className="text-sm text-gray-600">Subtotal</span><span className="font-semibold">₹{billData.subtotal}</span></div>
            {/* Placeholder: taxes/discounts */}
            <div className="flex items-center justify-between py-1"><span className="text-sm text-orange-500">Total</span><span className="font-bold text-lg text-orange-500">₹{billData.total}</span></div>
          </div>
        </div>
        <style jsx>{`
          /* Print helpers and format-specific styles */
          .printable-bill.thermal-80 { width: 80mm; max-width: 100%; }
          .printable-bill.a4 { width: 210mm; max-width: 100%; }

          @page thermal80 { size: 80mm auto; margin: 6mm; }
          @page a4 { size: A4; margin: 10mm; }

          @media print {
            body * { visibility: hidden; }
            .printable-bill, .printable-bill * { visibility: visible; }
            .printable-bill { position: absolute; left: 0; top: 0; width: 100%; }
            /* If thermal class present, prefer narrow page size */
            .printable-bill.thermal-80 { box-shadow: none; border-radius: 0; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default BillModal;
