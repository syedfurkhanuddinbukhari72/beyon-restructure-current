import React, { useCallback, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import * as localData from "@/src/localDataService";

// Components
import AdminLayout from "../../components/admin/layout/AdminLayout";
import ProductsTab from "../../components/admin/tabs/ProductsTab";

// Hooks
import { useAdminState } from "../../hooks/admin/useAdminState";
import { useAdminProducts } from "../../hooks/admin/useAdminProducts";

export default function AdminProductsPage() {
    const router = useRouter();

    // 1. Shared Admin UI State
    const {
        menuOpen,
        handleMenuToggle,
        menuButtonRef,
        menuDropdownRef,
        toast,
        toastType,
        hideToast,
        shopStatus,
        setShopStatus,
        TABS,
        // Product specific UI state from useAdminState
        productSearch,
        setProductSearch,
        showSearchBar,
        setShowSearchBar,
        showUnavailableOnly,
        setShowUnavailableOnly,
        handleProductMenuToggle,
        handleToggleOfferView,
        productMenuKey,
        setProductMenuKey,
        productEditState,
        setProductEditState,
        createEmptyProductEditState,
        offerOpen,
        setShowAddRemoveMenu,
        bulkBusy,
        setBulkBusy,
        setMenuOpen,
        showToast,
        chToast,
        showChToast,
        individualOverrides,
        setIndividualOverrides,
        setConfirmState
    } = useAdminState();

    // 2. Product Data State
    const {
        menu,
        productBusy,
        setProductBusy,
        fetchMenu: hookFetchMenu,
        saveProductStock,
        submitProductEdit: hookSubmitProductEdit,
    } = useAdminProducts();

    // 3. Handlers (Replicated from admin-unified.js)
    const handleTabChange = useCallback((newTab) => {
        if (newTab === "Orders" || newTab === "KOT") {
            router.push(`/admin-unified?tab=${newTab}`);
        } else if (newTab === "Offers") {
            router.push("/admin/offers");
        }
    }, [router]);

    const handleLogout = useCallback(() => {
        localStorage.removeItem("adminAuthenticated");
        router.push("/admin-login");
    }, [router]);

    const updateShopStatus = async (isOpen) => {
        // TODO: Implement or import if needed, for now just local state
        setShopStatus({ isOpen, isUpdating: false });
    };

    const handleShowAddRemoveMenu = useCallback(() => {
        setShowAddRemoveMenu(true);
    }, [setShowAddRemoveMenu]);

    // Product management handlers
    const updateProductStock = useCallback(async (category, productName, inStock, manualOverride) => {
        try {
            const payload = { name: productName, inStock };
            if (typeof manualOverride === 'boolean') {
                payload.manualOverride = manualOverride;
            }
            await localData.upsertProduct(category, payload);
            await hookFetchMenu();
        } catch (error) {
            console.error(error);
            showToast(`Failed to update product stock: ${error.message}`);
        }
    }, [hookFetchMenu, showToast]);

    const toggleProductStock = useCallback(async (category, product) => {
        const key = JSON.stringify({ c: category, n: product.name });
        if (productBusy[key]) return;
        setProductBusy((prev) => ({ ...prev, [key]: true }));
        try {
            const next = !(product.inStock !== false);
            const isChicken = product.isChicken === true || /chicken/i.test(product.name);
            let manualOverride = true;
            if (isChicken && ((next && product.inStock === true) || (!next && product.inStock === false))) {
                manualOverride = false;
            }
            await updateProductStock(category, product.name, next, manualOverride);
        } finally {
            setProductBusy((prev) => ({ ...prev, [key]: false }));
        }
    }, [productBusy, updateProductStock, setProductBusy]);

    // Chicken statistics
    const chickenStats = React.useMemo(() => {
        let total = 0, inStockCount = 0, unavailableCount = 0;
        for (const category of Object.keys(menu || {})) {
            for (const p of menu[category] || []) {
                const isChicken = p?.isChicken === true || /chicken/i.test(p?.name || "");
                if (isChicken) {
                    total += 1;
                    const isOn = p?.inStock === true;
                    if (isOn) inStockCount += 1; else unavailableCount += 1;
                }
            }
        }
        return { total, inStockCount, unavailableCount };
    }, [menu]);

    // Product edit handlers
    const handleEditPrice = useCallback((category, product) => {
        setProductMenuKey(null);
        setProductEditState({
            open: true,
            mode: 'price',
            category,
            product,
            value: typeof product.price === 'number' ? String(product.price) : '',
            busy: false,
            error: ''
        });
    }, [setProductMenuKey, setProductEditState]);

    const handleEditName = useCallback((category, product) => {
        setProductMenuKey(null);
        setProductEditState({
            open: true,
            mode: 'name',
            category,
            product,
            value: product?.name ?? '',
            busy: false,
            error: ''
        });
    }, [setProductMenuKey, setProductEditState]);

    const handleProductEditChange = useCallback((value) => {
        setProductEditState((prev) => ({ ...prev, value, error: '' }));
    }, [setProductEditState]);

    const submitProductEdit = useCallback(async () => {
        if (!productEditState?.open || productEditState?.busy) return;

        const { mode, category, product, value } = productEditState;
        if (!mode || !category || !product) {
            if (createEmptyProductEditState) {
                setProductEditState(createEmptyProductEditState());
            }
            return;
        }

        const trimmed = value.trim();
        if (!trimmed) {
            setProductEditState((prev) => ({
                ...prev,
                error: mode === 'price' ? 'Price cannot be empty.' : 'Name cannot be empty.'
            }));
            return;
        }

        if (mode === 'name' && trimmed === product.name) {
            if (createEmptyProductEditState) setProductEditState(createEmptyProductEditState());
            return;
        }

        if (mode === 'price') {
            const priceValue = Number(trimmed);
            if (Number.isNaN(priceValue) || priceValue < 0) {
                setProductEditState((prev) => ({ ...prev, error: 'Enter a valid price.' }));
                return;
            }
        }

        const busyKey = JSON.stringify({ c: category, n: product.name });
        if (productBusy[busyKey]) return;

        setProductEditState((prev) => ({ ...prev, busy: true, error: '' }));

        try {
            await hookSubmitProductEdit(mode, category, product, trimmed);
            showToast(mode === 'price' ? 'Price updated.' : 'Name updated.');
            if (createEmptyProductEditState) setProductEditState(createEmptyProductEditState());
        } catch (error) {
            console.error(mode === 'price' ? 'Edit price error' : 'Edit name error', error);
            const failureMessage = error?.message
                ? `Failed to update ${mode === 'price' ? 'price' : 'name'}: ${error.message}`
                : `Failed to update ${mode === 'price' ? 'price' : 'name'}.`;
            showToast(failureMessage);
            setProductEditState((prev) => ({ ...prev, busy: false, error: failureMessage }));
        }
    }, [productEditState, productBusy, hookSubmitProductEdit, showToast, setProductEditState, createEmptyProductEditState]);

    const closeProductEditModal = useCallback(() => {
        if (createEmptyProductEditState) setProductEditState(createEmptyProductEditState());
    }, [setProductEditState, createEmptyProductEditState]);

    // Offer handlers
    const handleEditOffer = useCallback((category, product) => {
        setProductMenuKey(null);
        router.push('/admin-offers');
    }, [setProductMenuKey, router]);

    const handleRemoveOffer = useCallback(async (category, product) => {
        setProductMenuKey(null);
        showToast('Removing offers should be handled in Offers page.');
    }, [setProductMenuKey, showToast]);

    const handleDeleteProduct = useCallback((category, product) => {
        setProductMenuKey(null);
        if (setConfirmState) {
            setConfirmState({
                open: true,
                title: 'Delete item',
                message: `Delete '${product.name}' from '${category}'? This WILL remove the item permanently.`,
                confirmText: 'Delete',
                cancelText: 'Cancel',
                busy: false,
                onConfirm: async () => {
                    setConfirmState({ open: false });
                },
            });
        }
    }, [setProductMenuKey, setConfirmState]);

    // Bulk chicken operations
    const bulkSetChicken = useCallback(async (inStockTarget) => {
        if (bulkBusy) return;
        const verb = inStockTarget ? 'ON' : 'OFF';
        const proceed = typeof window !== 'undefined' ? window.confirm(`Turn all 'Chicken' items ${verb}?`) : true;
        if (!proceed) return;

        setBulkBusy(true);
        try {
            const result = await localData.bulkToggleChickenItems(inStockTarget);
            if (showChToast) showChToast(`${result.changed} chicken items turned ${verb}.`);
            else showToast(`${result.changed} chicken items turned ${verb}.`);
            await hookFetchMenu();
        } catch (e) {
            console.error(e);
            if (showChToast) showChToast("Failed to bulk update chicken items.", 'error');
            else showToast("Failed to bulk update chicken items.");
        } finally {
            setBulkBusy(false);
        }
    }, [bulkBusy, showChToast, showToast, hookFetchMenu, setBulkBusy]);

    const handleCreateOffer = useCallback(() => {
        router.push("/admin-offers");
    }, [router]);

    // Close menus on outside click
    React.useEffect(() => {
        const clickHandler = (e) => {
            if (menuOpen && !menuDropdownRef.current?.contains(e.target) && !menuButtonRef.current?.contains(e.target)) {
                // setMenuOpen(false); // Depends on useAdminState exposing setMenuOpen
            }
        };
        const keyHandler = (e) => {
            if (e.key === "Escape") { /* setMenuOpen(false); */ }
        };
        document.addEventListener("mousedown", clickHandler);
        document.addEventListener("keydown", keyHandler);
        return () => {
            document.removeEventListener("mousedown", clickHandler);
            document.removeEventListener("keydown", keyHandler);
        };
    }, [menuOpen, menuDropdownRef, menuButtonRef]);

    return (
        <>
            <Head>
                <title>Admin - Products | BEYON79</title>
            </Head>
            <AdminLayout
                tabs={TABS}
                activeTab="Products"
                onTabChange={handleTabChange}
                toast={toast}
                toastType={toastType}
                onToastClose={hideToast}
                menuOpen={menuOpen}
                onMenuToggle={handleMenuToggle}
                menuButtonRef={menuButtonRef}
                menuDropdownRef={menuDropdownRef}
                shopStatus={shopStatus}
                onShopStatusToggle={() => updateShopStatus(!shopStatus.isOpen)}
                onLogout={handleLogout}
                router={router}
            >
                <ProductsTab
                    menu={menu}
                    productBusy={productBusy}
                    productSearch={productSearch}
                    showSearchBar={showSearchBar}
                    showUnavailableOnly={showUnavailableOnly}
                    bulkBusy={bulkBusy}
                    chickenStats={chickenStats}
                    productMenuKey={productMenuKey}
                    offerOpen={offerOpen}
                    onProductSearchChange={setProductSearch}
                    onToggleSearchBar={() => setShowSearchBar(!showSearchBar)}
                    onToggleUnavailableOnly={() => setShowUnavailableOnly(!showUnavailableOnly)}
                    onShowAddRemoveMenu={handleShowAddRemoveMenu}
                    onCreateOffer={handleCreateOffer}
                    onBulkChickenToggle={bulkSetChicken}
                    onProductMenuToggle={handleProductMenuToggle}
                    onEditPrice={handleEditPrice}
                    onEditName={handleEditName}
                    onEditOffer={handleEditOffer}
                    onRemoveOffer={handleRemoveOffer}
                    onDeleteProduct={handleDeleteProduct}
                    onToggleProductStock={toggleProductStock}
                    onToggleOfferView={handleToggleOfferView}
                    productEditState={productEditState}
                />
            </AdminLayout>
        </>
    );
}
