import React from 'react';
import Toast from '../Toast';

const AdminHeader = ({ 
  tabs, 
  activeTab, 
  onTabChange, 
  toast, 
  toastType,
  onToastClose,
  menuOpen,
  onMenuToggle,
  menuButtonRef,
  menuDropdownRef,
  shopStatus,
  onShopStatusToggle,
  onLogout,
  router
}) => {
  return (
    <>
      {toast && <Toast message={toast} onClose={onToastClose} type={toastType} />}
      
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-gray-200 mb-4 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2 overflow-x-auto flex-nowrap scrollbar-hide pr-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? "bg-orange-500 text-white shadow-sm"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
                onClick={() => onTabChange(tab)}
              >
                {tab}
              </button>
            ))}
            
            <div className="flex-shrink-0 ml-auto mr-2 flex items-center justify-center" ref={menuButtonRef}>
              <button
                aria-label="Admin menu"
                className="hamburger-menu w-[1.951rem] h-[1.951rem] self-center rounded-full flex items-center justify-center shadow-sm bg-gray-100 text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 relative z-10"
                onClick={onMenuToggle}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        {menuOpen && (
          <div
            ref={menuDropdownRef}
            className="fixed right-4 top-[3rem] w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-[999]"
          >
            <div className="p-2">
              <div className="px-2 py-2 text-xs uppercase tracking-wide text-gray-500">Shop</div>
              <button
                onClick={() => { onShopStatusToggle(); onMenuToggle(false); }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium mb-2 ${
                  shopStatus.isOpen ? "bg-orange-500 text-white" : "bg-gray-500 text-white"
                }`}
              >
                {shopStatus.isOpen ? "Open" : "Closed"}
              </button>
              <div className="px-2 py-2 text-xs uppercase tracking-wide text-gray-500">Actions</div>
              <button
                onClick={() => { router.push("/manual-order-complete"); onMenuToggle(false); }}
                className="w-full text-left px-3 py-2 rounded-md text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 mb-2"
              >
                Manual Order
              </button>
              <button
                onClick={() => { onLogout(); onMenuToggle(false); }}
                className="w-full text-left px-3 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminHeader;
