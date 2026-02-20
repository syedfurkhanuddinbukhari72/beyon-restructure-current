/**
 * useAdminOffers — Domain Hook (Offers)
 *
 * Responsibilities:
 * - Load active offer/bundle rules
 * - Persist offer rule changes
 * - Provide edit prefill data for UI navigation
 *
 * Non-responsibilities:
 * - Routing
 * - UI state (modals, toasts)
 * - Product price mutation
 *
 * Contract:
 * - fetchOffers(): loads rules, updates bundleRules; never throws
 * - saveOffer(payload): persists rule; returns true or throws
 * - deleteOffer(target): intentionally disabled until Phase 4.3
 * - editOffer(category, product): pure; never throws; returns { ok, prefill?, reason? }
 */
import { useState, useCallback, useEffect } from "react";
import * as localData from "@/src/localDataService";

export function useAdminOffers() {
  const [bundleRules, setBundleRules] = useState([]);
  const [offerForm, setOfferForm] = useState(null);
  const [offerType, setOfferType] = useState(null);
  const [offersBusy, setOffersBusy] = useState({ fetch: false, save: false, delete: false });

  const fetchOffers = useCallback(async () => {
    setOffersBusy((prev) => ({ ...prev, fetch: true }));
    try {
      const stored = await localData.getOffersRules();
      const list = Array.isArray(stored) ? stored : [];
      setBundleRules(list.filter((rule) => rule && rule.active !== false));
    } catch (error) {
      console.error("[useAdminOffers] fetchOffers failed", error);
      setBundleRules([]);
    } finally {
      setOffersBusy((prev) => ({ ...prev, fetch: false }));
    }
  }, []);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const saveOffer = useCallback(async (payload) => {
    setOffersBusy((prev) => ({ ...prev, save: true }));
    try {
      if (!payload || typeof payload !== "object") {
        throw new Error("Invalid offer payload");
      }

      const existing = await localData.getOffersRules();
      const base = Array.isArray(existing) ? existing : [];
      const next = [...base];
      const id = payload.id || `rule_${Date.now()}`;
      const index = next.findIndex((rule) => rule && rule.id === id);
      const normalized = { ...payload, id };

      if (index >= 0) {
        next[index] = { ...next[index], ...normalized };
      } else {
        next.push(normalized);
      }

      await localData.saveOffersRules(next);
      await fetchOffers();
      return true;
    } catch (error) {
      console.error("[useAdminOffers] saveOffer failed", error);
      throw error;
    } finally {
      setOffersBusy((prev) => ({ ...prev, save: false }));
    }
  }, [fetchOffers]);

  const deleteOffer = useCallback(() => {
    throw new Error("[useAdminOffers] deleteOffer is intentionally disabled until Phase 4.3");
  }, []);

  const editOffer = useCallback((category, product) => {
    if (!category || !product || !product.name) {
      return { ok: false, reason: "Invalid product selection" };
    }

    const prefill = {
      discount: {
        scope: "item",
        category,
        productName: product.name,
      },
    };

    return { ok: true, prefill };
  }, []);

  return {
    bundleRules,
    offerForm,
    offerType,
    offersBusy,
    fetchOffers,
    saveOffer,
    deleteOffer,
    editOffer,
  };
}
