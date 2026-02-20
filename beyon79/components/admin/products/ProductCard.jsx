import React, { useRef } from 'react';

const ProductCard = ({
  category,
  product,
  busy,
  menuOpenForProduct,
  offerOpen,
  bundleRules,
  onMenuToggle,
  onEditPrice,
  onEditName,
  onEditOffer,
  onRemoveOffer,
  onDeleteProduct,
  onToggleStock,
  onToggleOfferView
}) => {
  const key = JSON.stringify({ c: category, n: product.name });
  const inStock = product.inStock !== false;
  
  // Offer/bundle logic
  const hasDiscountOffer = typeof product.originalPrice === 'number' && product.originalPrice > (product.price ?? 0);
  const savings = hasDiscountOffer ? Math.max(0, Math.round(product.originalPrice - (product.price ?? 0))) : 0;
  const pct = hasDiscountOffer && product.originalPrice > 0 ? Math.round((savings / product.originalPrice) * 100) : 0;
  
  const matchesRule = (rule) => {
    try {
      if (!rule) return false;
      const nameEq = (a,b) => String(a||'').toLowerCase() === String(b||'').toLowerCase();
      const catEq = (a,b) => String(a||'').toLowerCase() === String(b||'').toLowerCase();
      
      if (rule.type === 'buy_x_get_y') {
        const baseMatch = rule.base && rule.base.match ? (
          (rule.base.match.name ? nameEq(rule.base.match.name, product.name) : true) &&
          (rule.base.match.category ? catEq(rule.base.match.category, category) : true)
        ) : false;
        const rewardMatch = (rule.reward?.items || []).some((r) => nameEq(r.name, product.name));
        return baseMatch || rewardMatch;
      }
      
      if (rule.type === 'fixed_combo_price') {
        const reqs = Array.isArray(rule.required) ? rule.required : [];
        return reqs.some((r) =>
          (r.name ? nameEq(r.name, product.name) : true) && 
          (r.category ? catEq(r.category, category) : true)
        );
      }
      
      return false;
    } catch { 
      return false; 
    }
  };
  
  const bundleMatches = (bundleRules || []).filter(matchesRule);
  const hasBundleOffer = bundleMatches.length > 0;
  const hasOffer = hasDiscountOffer || hasBundleOffer;

  return (
    <div className="relative border border-gray-200 p-4 rounded-lg bg-white h-full flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="font-medium text-gray-800">{product.name}</p>
          <p className="text-sm text-gray-600">₹{product.price}</p>
        </div>
        
        <div className="relative flex-shrink-0">
          <button
            type="button"
            aria-label="Product actions"
            onClick={(event) => {
              event.stopPropagation();
              onMenuToggle(key);
            }}
            className={`p-1.5 rounded-full border border-transparent text-gray-500 hover:text-gray-900 hover:border-orange-200 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-400 ${
              menuOpenForProduct ? 'bg-orange-50 text-orange-600 border-orange-200' : ''
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="block">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
          
          {menuOpenForProduct && (
            <div className="absolute right-0 mt-2 w-40 rounded-lg border border-gray-200 bg-white shadow-lg z-20 overflow-hidden">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onEditPrice(category, product);
                }}
                className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600"
              >
                Edit Price
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onEditName(category, product);
                }}
                className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600"
              >
                Edit Name
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onEditOffer(category, product);
                }}
                className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600"
              >
                Edit Offer
              </button>
              {hasDiscountOffer && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveOffer(category, product);
                  }}
                  className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600"
                >
                  Remove Offer
                </button>
              )}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteProduct(category, product);
                }}
                className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Delete Item
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-2 pt-1 flex justify-between items-end gap-2">
        <div className="flex items-center gap-2">
          {hasOffer && (
            <button
              type="button"
              title="View applied offer"
              aria-label="View applied offer"
              onClick={() => onToggleOfferView(key)}
              className="px-3 py-1 rounded-full text-sm font-semibold inline-flex items-center gap-2 bg-red-50 text-red-800 border border-red-200 hover:bg-red-100"
            >
              View Offer
            </button>
          )}
        </div>
        
        <div className="flex items-center">
          <button
            onClick={() => onToggleStock(category, product)}
            disabled={busy}
            className={`px-3 py-1 rounded-full text-sm font-semibold inline-flex items-center gap-2 ${
              inStock
                ? busy
                  ? "bg-orange-300 text-white cursor-not-allowed"
                  : "bg-orange-500 text-white hover:bg-orange-600"
                : busy
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-gray-500 text-white hover:bg-gray-600"
            }`}
          >
            {busy && (
              <span className="inline-block w-3.5 h-3.5 border-2 border-white/80 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            )}
            {inStock ? "In Stock" : "Unavailable"}
          </button>
        </div>
      </div>
      
      {hasOffer && offerOpen && (
        <div className="mt-2 text-xs bg-red-50 text-red-900 border border-red-200 rounded p-2">
          {hasDiscountOffer && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
              <div>
                Original: <span className="font-semibold">₹{product.originalPrice}</span>
              </div>
              <div>
                Now: <span className="font-semibold">₹{product.price}</span>
              </div>
              <div>
                Saved: <span className="font-semibold">₹{savings}</span>
                {pct ? <span> ({pct}%)</span> : null}
              </div>
            </div>
          )}
          
          {hasBundleOffer && (
            <div className="space-y-1">
              <div className="font-semibold">Bundle/Combo rules affecting this item:</div>
              <ul className="list-disc ml-5 space-y-0.5">
                {bundleMatches.map((r) => (
                  <li key={r.id || r._id || JSON.stringify(r)}>
                    {r.type === 'buy_x_get_y' && (
                      <>
                        Buy {r.base?.quantity || 0} x {r.base?.match?.name || r.base?.match?.category || 'item'} → Get {r.reward?.items?.[0]?.quantity || 1} x {r.reward?.items?.[0]?.name} @ ₹{r.reward?.items?.[0]?.price ?? 0}
                      </>
                    )}
                    {r.type === 'fixed_combo_price' && (
                      <>
                        Combo: ₹{r.price} — Required: {(r.required || []).map((x) => x.name || x.category).join(', ')}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="mt-2">
            <button
              type="button"
              onClick={() => onToggleOfferView(key)}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-white text-red-800 border border-red-200 hover:bg-red-100"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => window.location.href = '/admin-offers'}
              className="ml-2 px-2.5 py-1 rounded-md text-xs font-medium bg-red-600 text-white hover:bg-red-700"
            >
              Manage Offers
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCard;
