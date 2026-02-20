import React from 'react';
import AdminHeader from './AdminHeader';

const AdminLayout = ({ 
  children, 
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
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-4">
        <AdminHeader
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={onTabChange}
          toast={toast}
          toastType={toastType}
          onToastClose={onToastClose}
          menuOpen={menuOpen}
          onMenuToggle={onMenuToggle}
          menuButtonRef={menuButtonRef}
          menuDropdownRef={menuDropdownRef}
          shopStatus={shopStatus}
          onShopStatusToggle={onShopStatusToggle}
          onLogout={onLogout}
          router={router}
        />
        {children}
      </div>
    </div>
  );
};

export default AdminLayout;
