import React, { useState, useRef, useCallback } from 'react';
import ProductEditModal from '../ProductEditModal';
import ProductCard from '../products/ProductCard';
import ProductToolbar from '../products/ProductToolbar';

const ProductsTab = ({
  menu,
  productBusy,
  productSearch,
  showSearchBar,
  showUnavailableOnly,
  bulkBusy,
  chickenStats,
  productMenuKey,
  offerOpen,
  onProductSearchChange,
  onToggleSearchBar,
  onToggleUnavailableOnly,
  onShowAddRemoveMenu,
  onCreateOffer,
  onBulkChickenToggle,
  onProductMenuToggle,
  onEditPrice,
  onEditName,
  onEditOffer,
  onRemoveOffer,
  onDeleteProduct,
  onToggleProductStock,
  onToggleOfferView,
  productEditState,
  onProductEditChange,
  onSubmitProductEdit,
  onCloseProductEditModal,
  hookBundleRules
}) => {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800">Product Stock Management</h2>
      
      <ProductToolbar
        productSearch={productSearch}
        showSearchBar={showSearchBar}
        showUnavailableOnly={showUnavailableOnly}
        bulkBusy={bulkBusy}
        chickenStats={chickenStats}
        onProductSearchChange={onProductSearchChange}
        onToggleSearchBar={onToggleSearchBar}
        onToggleUnavailableOnly={onToggleUnavailableOnly}
        onShowAddRemoveMenu={onShowAddRemoveMenu}
        onCreateOffer={onCreateOffer}
        onBulkChickenToggle={onBulkChickenToggle}
      />

      <div className="grid gap-4">
        {Object.keys(menu).map((category) => {
          const items = (menu[category] || []).filter((product) => {
            const inStock = product.inStock !== false;
            const availabilityOk = showUnavailableOnly ? !inStock : true;
            const q = productSearch.trim().toLowerCase();
            const searchOk = q ? product.name.toLowerCase().includes(q) : true;
            return availabilityOk && searchOk;
          });
          
          if (items.length === 0) return null;
          
          return (
            <div key={category} className="mb-6">
              <h3 className="text-lg font-semibold mb-2 text-gray-700">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((product) => (
                  <ProductCard
                    key={product.name}
                    category={category}
                    product={product}
                    busy={productBusy[JSON.stringify({ c: category, n: product.name })]}
                    menuOpenForProduct={productMenuKey === JSON.stringify({ c: category, n: product.name })}
                    offerOpen={offerOpen[JSON.stringify({ c: category, n: product.name })]}
                    bundleRules={hookBundleRules}
                    onMenuToggle={onProductMenuToggle}
                    onEditPrice={onEditPrice}
                    onEditName={onEditName}
                    onEditOffer={onEditOffer}
                    onRemoveOffer={onRemoveOffer}
                    onDeleteProduct={onDeleteProduct}
                    onToggleStock={onToggleProductStock}
                    onToggleOfferView={onToggleOfferView}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <ProductEditModal
        state={productEditState}
        onChange={onProductEditChange}
        onSubmit={onSubmitProductEdit}
        onClose={onCloseProductEditModal}
      />
    </div>
  );
};

export default ProductsTab;
