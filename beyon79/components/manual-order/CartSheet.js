export default function CartSheet({
  open,
  cartItems,
  totalAmount,
  customerName,
  customerNumber,
  note,
  placing,
  resultMsg,
  onChangeCustomerName,
  onChangeCustomerNumber,
  onChangeNote,
  onClearCart,
  onPlaceOrder,
  onClose,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4 pt-3" style={{ maxHeight: '85vh' }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-lg text-black">Manual Order Cart</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1" aria-label="Close">✕</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <input
            className="border border-gray-300 focus:border-orange-400 focus:ring-0 outline-none p-2 rounded text-black placeholder:text-gray-400"
            placeholder="Customer Name (optional)"
            value={customerName}
            onChange={(e) => onChangeCustomerName(e.target.value)}
          />
          <input
            className="border border-gray-300 focus:border-orange-400 focus:ring-0 outline-none p-2 rounded text-black placeholder:text-gray-400"
            placeholder="Phone Number (optional)"
            value={customerNumber}
            onChange={(e) => onChangeCustomerNumber(e.target.value)}
          />
          <input
            className="sm:col-span-2 border border-gray-300 focus:border-orange-400 focus:ring-0 outline-none p-2 rounded text-black placeholder:text-gray-400"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => onChangeNote(e.target.value)}
          />
        </div>

        <div style={{ maxHeight: '38vh', overflowY: 'auto', marginBottom: '1rem' }} className="hide-scrollbar">
          <style jsx global>{`
            .hide-scrollbar {
              scrollbar-width: none;
              -ms-overflow-style: none;
              overscroll-behavior: contain;
            }
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {cartItems.length === 0 ? (
            <p className="text-gray-500 py-4 text-center">No items added.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {cartItems.map((item) => (
                <li key={item.key} className={item.className}>
                  <div className="min-w-0 flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-gray-800 truncate flex items-center gap-1">
                      {item.name}
                      {item.isConsumed && <span className="ml-2 text-yellow-600 text-xs font-semibold">Offer Applied</span>}
                      {item.isReward && <span className="ml-2 text-green-600 text-xs font-semibold">Free (Offer)</span>}
                    </span>
                    {item.rewardDisplays && item.rewardDisplays.length > 0 && (
                      <div className="text-xs text-green-700 font-semibold" style={{ maxWidth: 360 }}>
                        <div style={{ maxHeight: 48, overflow: 'auto', whiteSpace: 'normal', lineHeight: '1.15', paddingRight: 6 }}>
                          {`Reward: ${item.rewardDisplays.join(', ')}`}
                        </div>
                      </div>
                    )}
                    {item.discount > 0 && (
                      <span className="text-xs text-green-700 font-semibold">
                        {item.offerLabel}: <span className="line-through text-gray-400">₹{item.originalPrice}</span> <span className="ml-1">₹{item.discountedPrice}</span> <span className="ml-1 text-gray-500">(Saved ₹{item.discount})</span>
                      </span>
                    )}
                    {item.isReward && <span className="text-xs text-green-700">{`Offer price: ₹${item.offerPrice ?? 0}`}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="h-7 w-7 inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-800 hover:bg-gray-300"
                      onClick={item.onDecrease}
                      aria-label="Decrease"
                      title="Decrease"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-semibold text-black">{item.quantity}</span>
                    <button
                      className="h-7 w-7 inline-flex items-center justify-center rounded-full bg-orange-500 text-black hover:bg-orange-600"
                      onClick={item.onIncrease}
                      aria-label="Increase"
                      title="Increase"
                    >
                      +
                    </button>
                    {item.isConsumed ? (
                      <div className="w-36 text-right text-sm text-black">
                        <div className="text-sm font-semibold">Consumed: {item.quantity}</div>
                        <div className="text-sm text-orange-500 font-semibold">Offer charge: ₹{item.chargeAmount}</div>
                      </div>
                    ) : (
                      <span className="w-14 text-right text-sm text-black font-semibold">₹{item.price * item.quantity}</span>
                    )}
                    <button
                      className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-300 ml-1"
                      onClick={item.onRemove}
                      aria-label={`Remove ${item.name}`}
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ position: 'sticky', bottom: 0, background: 'white', paddingTop: 12, paddingBottom: 8, zIndex: 2 }} className="flex justify-between items-center gap-2 border-t border-gray-200">
          <span className="font-bold text-black">Total: ₹{totalAmount}</span>
          <div className="flex gap-2">
            <button
              className="bg-gray-200 text-gray-800 hover:bg-gray-300 px-3 py-1.5 rounded-md"
              onClick={onClearCart}
            >
              Clear
            </button>
            <button
              disabled={placing}
              className={`px-4 py-1.5 rounded-md text-white ${placing ? 'bg-orange-300' : 'bg-orange-500 hover:bg-orange-600'}`}
              onClick={async () => { await onPlaceOrder(); onClose(); }}
            >
              {placing ? 'Placing...' : 'Place Order'}
            </button>
          </div>
        </div>

        {resultMsg && (
          <p
            className={`text-sm mt-2 ${
              resultMsg.startsWith('✅')
                ? 'text-green-700'
                : resultMsg.startsWith('⚠️')
                ? 'text-yellow-700'
                : 'text-red-700'
            }`}
          >
            {resultMsg}
          </p>
        )}
      </div>
    </div>
  );
}
