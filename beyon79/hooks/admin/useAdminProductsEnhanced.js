import { useState, useCallback, useMemo } from 'react';
import * as localData from '@/src/localDataService';

export function useAdminProductsEnhanced() {
  const [menu, setMenu] = useState({});
  const [productBusy, setProductBusy] = useState({});

  const fetchMenu = useCallback(async () => {
    try {
      const data = await localData.getMenu();
      setMenu(data);
    } catch (err) {
      console.error("Error fetching menu:", err);
    }
  }, []);

  const saveProductStock = useCallback(async (category, payload) => {
    try {
      await localData.upsertProduct(category, payload);
      await fetchMenu();
    } catch (error) {
      console.error(error);
      throw error;
    }
  }, [fetchMenu]);

  const submitProductEdit = useCallback(async (mode, category, product, value) => {
    const busyKey = JSON.stringify({ c: category, n: product.name });
    if (productBusy[busyKey]) return;
    setProductBusy((prev) => ({ ...prev, [busyKey]: true }));
    try {
      const trimmed = value.trim();
      if (!trimmed) {
        throw new Error(mode === 'price' ? 'Price cannot be empty.' : 'Name cannot be empty.');
      }
      if (mode === 'name' && trimmed === product.name) {
        return;
      }
      if (mode === 'price') {
        const priceValue = Number(trimmed);
        if (Number.isNaN(priceValue) || priceValue < 0) {
          throw new Error('Enter a valid price.');
        }
        await localData.upsertProduct(category, { ...product, name: product.name, price: priceValue });
      } else {
        const menuSnapshot = await localData.getMenu();
        const list = Array.isArray(menuSnapshot?.[category]) ? [...menuSnapshot[category]] : [];
        const dup = list.some((item) => String(item?.name || '').toLowerCase() === trimmed.toLowerCase());
        if (dup) {
          throw new Error('Another item with that name already exists.');
        }
        const index = list.findIndex((item) => item?.name === product.name);
        if (index === -1) {
          throw new Error('Item not found. Refresh and try again.');
        }
        const updated = { ...list[index], name: trimmed };
        list[index] = updated;
        const updatedMenu = { ...menuSnapshot, [category]: list };
        await localData.saveMenu(updatedMenu);
      }
      await fetchMenu();
    } catch (error) {
      console.error(mode === 'price' ? 'Edit price error' : 'Edit name error', error);
      throw error;
    } finally {
      setProductBusy((prev) => {
        const next = { ...prev };
        delete next[busyKey];
        return next;
      });
    }
  }, [productBusy, fetchMenu]);

  // Chicken statistics
  const chickenStats = useMemo(() => {
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

  // Category list
  const categoryList = useMemo(() => {
    try {
      return Object.keys(menu || {}).sort((a, b) => a.localeCompare(b));
    } catch {
      return [];
    }
  }, [menu]);

  // Toggle product stock
  const toggleProductStock = useCallback(async (category, product, individualOverrides, updateProductStock) => {
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
  }, [productBusy, updateProductStock]);

  // Bulk chicken operations
  const bulkSetChicken = useCallback(async (inStockTarget, options = {}, chickenStats, showChToast, bulkBusy, setBulkBusy, fetchMenu) => {
    const { skipConfirm } = options;
    if (bulkBusy) return;
    if (chickenStats.total === 0) {
      showChToast("No Chicken products found.");
      return;
    }
    const verb = inStockTarget ? 'ON' : 'OFF';
    const proceed = skipConfirm ? true : (typeof window !== 'undefined' ? window.confirm(`Turn all 'Chicken' items ${verb}?`) : true);
    if (!proceed) return;

    setBulkBusy(true);
    try {
      const result = await localData.bulkToggleChickenItems(inStockTarget);
      showChToast(`${result.changed} chicken items turned ${verb}.`);
      await fetchMenu();
    } catch (e) {
      console.error(e);
      showChToast("Failed to bulk update chicken items.", 'error');
    } finally {
      setBulkBusy(false);
    }
  }, []);

  const bulkOffChickenWithOverrides = useCallback(async ({ noConfirm = false, silent = false } = {}, individualOverrides, showChToast, fetchMenu, setBulkBusy) => {
    const ok = noConfirm || (typeof window !== 'undefined' ? window.confirm("Turn OFF all chicken items except manually overridden ones?") : true);
    if (!ok) return;
    try {
      setBulkBusy(true);
      const excludeItems = Object.keys(individualOverrides).filter(
        (itemName) => individualOverrides[itemName]?.inStock === true
      );
      const info = await localData.bulkToggleChickenItems(false, excludeItems);
      if (!silent) {
        showChToast(`Turned OFF ${info.changed || '-'} chicken items (manual overrides preserved).`);
      }
      await fetchMenu();
    } catch (error) {
      console.error('bulkOffChickenWithOverrides', error);
      if (!silent) showChToast('Failed to turn OFF chicken items.', 'error');
    } finally {
      setBulkBusy(false);
    }
  }, []);

  // Add item
  const submitAddItem = useCallback(async (addForm, addBusy, setAddBusy, menu, showToast, resetAddForm, setShowAddItem, setAddForm, setRemoveForm, hookFetchMenu) => {
    if (addBusy) return;
    const chosenCategory = addForm.isNewCategory ? addForm.newCategory.trim() : addForm.category.trim();
    const name = addForm.name.trim();
    const priceStr = String(addForm.price ?? "").trim();
    const hasPrice = priceStr !== "";
    const price = hasPrice ? Number(priceStr) : undefined;

    if (!chosenCategory) {
      showToast("Please select or enter a category.");
      return;
    }
    if (!name) {
      showToast("Please enter a product name.");
      return;
    }
    if (hasPrice && (Number.isNaN(price) || price < 0)) {
      showToast("Please enter a valid price or leave it blank.");
      return;
    }

    const dup = (menu?.[chosenCategory] || []).some(
      (p) => String(p?.name || "").toLowerCase() === name.toLowerCase()
    );
    if (dup) {
      const ok = window.confirm(
        `An item named '${name}' already exists in '${chosenCategory}'. Update it?`
      );
      if (!ok) return;
    }

    try {
      setAddBusy(true);
      await localData.upsertProduct(chosenCategory, {
        name: name,
        ...(hasPrice ? { price } : {}),
        inStock: !!addForm.inStock,
        ...(typeof addForm.isChicken === 'boolean' ? { isChicken: addForm.isChicken } : {}),
      });
      await hookFetchMenu();
      setShowAddItem(false);
      setAddForm({ category: chosenCategory, isNewCategory: false, newCategory: "", name: "", price: "", inStock: true, isChicken: false });
      setRemoveForm({ category: chosenCategory, productName: name });
      showToast(dup ? "Item updated." : "Item added.");
    } catch (e) {
      showToast(`Failed to add item: ${e.message || e}`);
    } finally {
      setAddBusy(false);
    }
  }, []);

  return {
    menu,
    setMenu,
    productBusy,
    setProductBusy,
    fetchMenu,
    saveProductStock,
    submitProductEdit,
    chickenStats,
    categoryList,
    toggleProductStock,
    bulkSetChicken,
    bulkOffChickenWithOverrides,
    submitAddItem,
  };
}
