import React from 'react';

const ProductToolbar = ({
  productSearch,
  showSearchBar,
  showUnavailableOnly,
  bulkBusy,
  chickenStats,
  onProductSearchChange,
  onToggleSearchBar,
  onToggleUnavailableOnly,
  onShowAddRemoveMenu,
  onCreateOffer,
  onBulkChickenToggle
}) => {
  const isChickenOn = chickenStats.total > 0 && chickenStats.inStockCount === chickenStats.total;

  return (
    <div className="w-full overflow-x-auto scrollbar-none" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
      <div className="mt-2 mb-4 flex items-center gap-2 min-w-0 w-max border-[0.4px] border-gray-400 rounded-full bg-white/80 px-4 py-1.25 shadow-sm whitespace-nowrap touch-pan-x scrollbar-none" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        <button
          onClick={onToggleSearchBar}
          className="inline-flex items-center justify-center px-3.5 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300"
          title="Search"
          aria-label="Search"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <circle cx="11" cy="11" r="7"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
        
        {showSearchBar && (
          <input
            value={productSearch}
            onChange={(e) => onProductSearchChange(e.target.value)}
            placeholder="Search products..."
            className="max-w-xs w-[220px] bg-white border border-gray-300 rounded-full pl-3 pr-3 py-2 text-sm outline-none focus:border-orange-400 text-black placeholder:text-gray-400"
          />
        )}
        
        <button
          onClick={onToggleUnavailableOnly}
          className={`px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
            showUnavailableOnly ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200"
          }`}
        >
          Unavailable Items
        </button>
        
        <button
          onClick={onShowAddRemoveMenu}
          className="px-3.5 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800 hover:bg-orange-500 hover:text-white transition-colors"
        >
          Add/Remove Items
        </button>
        
        <button
          onClick={onCreateOffer}
          className="px-3.5 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800 hover:bg-orange-500 hover:text-white transition-colors"
        >
          Apply Offers
        </button>
        
        <button
          onClick={() => {
            if (isChickenOn) {
              onBulkChickenToggle(false);
            } else {
              onBulkChickenToggle(true);
            }
          }}
          disabled={bulkBusy}
          className={
            'px-3.5 py-2 rounded-full h-[2.004rem] w-20 hover:opacity-80 inline-flex items-center justify-center font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 text-white text-[93.2%] ' +
            (isChickenOn ? 'bg-green-500' : 'bg-[#FF033E]') +
            (bulkBusy ? ' opacity-70 cursor-not-allowed' : '')
          }
          style={{transition: 'background 0.2s'}}
        >
          {bulkBusy ? (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
          ) : (
            isChickenOn ? 'CH ON' : 'CH OFF'
          )}
        </button>
      </div>
    </div>
  );
};

export default ProductToolbar;
