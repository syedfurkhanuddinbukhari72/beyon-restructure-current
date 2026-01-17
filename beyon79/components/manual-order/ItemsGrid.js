import OfferBadge from './OfferBadge';

export default function ItemsGrid({ filteredItems, isPortrait, offerItems, expandedOffer, menuData, offers, cartSheetOpen, onAddToCart, onExpandOffer, onGridKeyDown, onTouchStart, onTouchEnd, cardStyles }) {
  return (
    <div
      className={`manual-order-grid grid gap-3 ${isPortrait ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' : ''}`}
      style={isPortrait ? undefined : { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}
      onKeyDown={onGridKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {filteredItems.map((item, idx, arr) => {
        const inStock = item.inStock !== false;
        const handleExpand = (name) => {
          onExpandOffer(name);
        };
        const paddingClass = isPortrait ? 'p-2.5 sm:p-3' : 'p-2 sm:p-2';
        const heightClass = !isPortrait && !cardStyles[idx]?.minHeight ? 'min-h-[118px]' : '';
        const borderClasses = inStock
          ? 'border-orange-500 sm:border-orange-500 hover:border-black focus:border-black focus-visible:border-black'
          : 'border-gray-300 sm:border-gray-400';
        const cardClasses = `manual-order-card rounded-lg bg-gray-50 ${paddingClass} shadow-sm hover:shadow transition-shadow flex flex-col transform origin-top-left scale-[0.90] sm:scale-100 border-2 ${borderClasses} hover:bg-black/5 focus:bg-black/5 relative ${heightClass}`;
        const cardStyle = cardStyles[idx] || {};
        return (
          <div
            key={item.name}
            className={cardClasses}
            role="button"
            tabIndex={inStock ? 0 : -1}
            onClick={(event) => {
              if (!inStock) return;
              const target = event.target;
              if (target instanceof HTMLElement && target.closest('button')) return;
              onAddToCart(item);
            }}
            onKeyDown={(event) => {
              if (!inStock) return;
              if (cartSheetOpen) return;
              if (event.target instanceof HTMLElement && event.target.closest('button')) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onAddToCart(item);
              }
            }}
            onFocus={(e) => {
              try { e.currentTarget.classList.add('keyboard-focused'); } catch (err) {}
            }}
            onBlur={(e) => {
              try { e.currentTarget.classList.remove('keyboard-focused'); } catch (err) {}
            }}
            style={cardStyle}
          >
            {offerItems.has(item.name) && (
              <OfferBadge item={item} offersJson={offers} menuData={menuData} onExpand={handleExpand} isExpanded={expandedOffer === item.name} />
            )}
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-[1.05rem] font-semibold text-black leading-snug sm:text-[1.25rem]">{item.name}</h3>
                <p className="text-[1.05rem] font-semibold text-gray-800 leading-snug sm:text-[1.25rem]">₹{item.price}</p>
              </div>
            </div>
            <div className="mt-2 pt-1 flex-1 flex items-end justify-between">
              <span className="text-xs text-gray-500 font-semibold align-bottom">
                {!inStock ? 'N/A' : ''}
              </span>
              <button
                disabled={!inStock}
                onClick={(e) => {
                  e.stopPropagation();
                  if (inStock) onAddToCart(item);
                }}
                onKeyDown={(e) => {
                  if (cartSheetOpen) { e.stopPropagation(); return; }
                  if (e.key === 'Enter' && inStock) {
                    e.preventDefault();
                    onAddToCart(item);
                  }
                  e.stopPropagation();
                }}
                className={`inline-flex items-center justify-center rounded-full shadow-sm text-[1.1rem] h-[38px] w-[38px] sm:h-[48px] sm:w-[48px] sm:text-[1.25rem] ${inStock ? 'bg-orange-500 text-white hover:bg-orange-600 focus:ring-2 focus:ring-orange-300' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                title={inStock ? "Add to Cart" : "Unavailable"}
                aria-label={inStock ? `Add ${item.name}` : "Unavailable"}
              >
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
