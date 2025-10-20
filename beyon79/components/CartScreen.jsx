import React from 'react';

export default function CartScreen({
  items = [],
  onRemove = () => {},
  onUpdateQuantity = () => {},
  note,
  setNote,
  phone,
  setPhone,
  onPlaceOrder = () => {},
  onWhatsApp = () => {},
  subtotal,
  itemCount,
}) {
  const total = subtotal !== undefined ? subtotal : items.reduce((a, b) => a + Number(b.price || 0) * Number(b.quantity || 0), 0);

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center font-sans">
      <div className="w-full max-w-lg mx-auto px-4 pt-6 pb-8">
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <main className="p-5 space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-gray-800">Your Cart</h2>
              <p className="text-gray-600 text-sm">Review items and place your order.</p>
            </div>

            <div className="space-y-3">
              {items.length === 0 && (
                <div className="bg-white rounded-lg p-4 text-center text-gray-600">No items in cart.</div>
              )}

              {items.map((item, idx) => (
                <div key={idx} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 flex justify-between items-start">
                  <div>
                    <h3 style={{ fontSize: '96%' }} className="text-lg font-medium text-gray-900">{item.name}</h3>
                    <p style={{ fontSize: '96%' }} className="text-sm text-gray-500">₹{item.price} × {item.quantity} = <span className="font-medium text-gray-800">₹{Number(item.price || 0) * Number(item.quantity || 0)}</span></p>
                  </div>

                  <div className="ml-4 bg-gray-50 rounded-full px-2 py-0.5 flex items-center gap-2 border border-gray-200 translate-y-2 md:translate-y-0">
                    <button onClick={() => onUpdateQuantity(item.name, -1)} className="w-7 h-7 md:w-8 md:h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-300 disabled:opacity-50 text-base md:text-lg font-semibold leading-none" disabled={Number(item.quantity || 0) <= 1} aria-label={`Decrease ${item.name}`}>−</button>
                    <div className="px-2 text-sm font-medium text-gray-800">{item.quantity}</div>
                    <button onClick={() => onUpdateQuantity(item.name, +1)} className="w-7 h-7 md:w-8 md:h-8 bg-gray-500 text-white rounded-full flex items-center justify-center hover:bg-gray-600 text-base md:text-lg font-semibold leading-none" aria-label={`Increase ${item.name}`}>+</button>
                    <button onClick={() => onRemove(item.name)} className="ml-1 md:ml-2 w-7 h-7 md:w-8 md:h-8 inline-flex items-center justify-center rounded-full border border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-300 text-base md:text-lg font-semibold leading-none" aria-label={`Remove ${item.name}`}>×</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Subtotal</p>
                <p className="text-lg font-semibold text-gray-900">₹{total}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Items</p>
                <p className="text-sm font-medium">{itemCount !== undefined ? itemCount : items.reduce((acc, item) => acc + Number(item.quantity || 0), 0)}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-2">+ Add Note</label>
              <textarea id="note" value={note} onChange={(e) => setNote && setNote(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none" rows={3} placeholder="Add any special instructions..." />
            </div>

            <button onClick={onPlaceOrder} style={{ backgroundColor: '#D1D5DB' }} className="w-full !bg-gray-300 text-gray-800 py-4 rounded-lg font-semibold text-lg !hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors">Place Order</button>

            <button onClick={onWhatsApp} className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors" aria-label="Order via WhatsApp">
              <img src="/icons/whatsapp-icon.png" alt="WhatsApp logo" className="w-6 h-6 rounded-sm bg-white/10 p-0.5" width="24" height="24" />
              <span>Order via WhatsApp</span>
            </button>
          </main>
        </div>
      </div>
    </div>
  );
}