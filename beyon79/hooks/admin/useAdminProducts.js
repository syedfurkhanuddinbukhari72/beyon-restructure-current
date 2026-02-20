import { useState, useCallback } from 'react';
import * as localData from '@/src/localDataService';

export function useAdminProducts() {
  const [menu, setMenu] = useState({});
  const [productBusy, setProductBusy] = useState({});

  const fetchMenu = useCallback(async () => {
    if (typeof window === 'undefined') return;
    try {
      const data = await localData.getMenu();
      setMenu(data);
    } catch (err) {
      console.error("Error fetching menu:", err);
    }
  }, []);

  const saveProductStock = useCallback(async (category, payload) => {
    if (typeof window === 'undefined') return;
    try {
      await localData.upsertProduct(category, payload);
      await fetchMenu();
    } catch (error) {
      console.error(error);
      throw error;
    }
  }, [fetchMenu]);

  const submitProductEdit = useCallback(async (mode, category, product, value) => {
    if (typeof window === 'undefined') return;
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

  return {
    menu,
    productBusy,
    setProductBusy,
    fetchMenu,
    saveProductStock,
    submitProductEdit,
  };
}
