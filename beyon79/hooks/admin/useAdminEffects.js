import { useEffect, useCallback } from 'react';
import * as localData from "@/src/localDataService";
import menuDataJSON from "../../data/menuData.json";
import localOrdersJSON from "../../data/local-orders.json";

export const useAdminEffects = (
  tab,
  lazyLoad,
  setLazyLoad,
  fetchAndFilterOrders,
  fetchMenu,
  fetchOffers,
  fetchShopStatus,
  hookFetchMenu,
  messageListenerRef,
  handleMessage
) => {
  
  // Initialize local storage with seed data on first run
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const initializeData = async () => {
      try {
        const existingMenu = await localData.getMenu();
        const existingOrders = await localData.getAllOrders();
        
        if (!existingMenu || Object.keys(existingMenu).length === 0) {
          console.log("Initializing menu data from JSON...");
          await localData.saveMenu(menuDataJSON);
        }
        
        if (!existingOrders || existingOrders.length === 0) {
          console.log("Initializing orders data from JSON...");
          await localData.saveAllOrders(localOrdersJSON || []);
        }
        
        // Initialize shop status if needed
        const shopStatus = await localData.getShopStatus();
        if (!shopStatus || Object.keys(shopStatus).length === 0) {
          console.log("Initializing shop status...");
          await localData.setShopStatus(true);
        }
        
        console.log("Local data initialization complete");
      } catch (error) {
        console.error("Error initializing local data:", error);
      }
    };
    
    initializeData();
  }, []); // Run only once on mount

  // Fetch active bundle/combo rules once
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fetchRules = async () => {
      try {
        if (fetchOffers) await fetchOffers();
      } catch (e) {
        // silent
      }
    };
    fetchRules();
  }, [fetchOffers]);

  // Debounced fetch on tab change: wait ~1s before fetching once
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (tab === "Products") return;
    setLazyLoad(true);
    const timer = setTimeout(() => {
      setLazyLoad(false);
      if (fetchAndFilterOrders) fetchAndFilterOrders();
    }, 1000);
    return () => clearTimeout(timer);
  }, [tab, fetchAndFilterOrders, setLazyLoad]);

  // Fetch Menu on Products tab
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (tab === "Products" && fetchMenu) {
      fetchMenu();
    }
  }, [tab, fetchMenu]);

  // Refresh menu data when returning to Products tab (for offer updates)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (tab === "Products") {
      const refreshMenuForOffers = async () => {
        try {
          if (hookFetchMenu) await hookFetchMenu();
          await fetchOffers();
        } catch (err) {
          console.error("Error refreshing menu for offers:", err);
        }
      };
      refreshMenuForOffers();
    }
  }, [tab, hookFetchMenu, fetchOffers]);

  // Fetch Shop Status on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (fetchShopStatus) fetchShopStatus();
  }, [fetchShopStatus]);

  // Close menu on outside click
  useEffect(() => {
    const clickHandler = (e) => {
      // This will be handled by the parent component
    };
    const keyHandler = (e) => {
      if (e.key === "Escape") {
        // This will be handled by the parent component
      }
    };
    document.addEventListener("mousedown", clickHandler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", clickHandler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, []);

  return {
    // No return values needed, this hook just manages effects
  };
};
