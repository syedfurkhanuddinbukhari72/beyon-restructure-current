"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { getMenu, getOffersRules, saveOffersRules, saveMenu } from "../src/localDataService";
import menuSeed from "../data/menuData.json";
import offersSeed from "../data/offers.json";

function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 1000 }} className="bg-orange-600 text-white px-4 py-2 rounded shadow-lg">
      {message}
    </div>
  );
}

export default function AdminOffersPage() {
  const router = useRouter();

  const [menu, setMenu] = useState({});
  const [toast, setToast] = useState("");
  const [offersBusy, setOffersBusy] = useState(false);
  // Current Offer moved to dedicated page; modal removed

  const [offerType, setOfferType] = useState("discount"); // 'discount' and 'bundle' supported in UI
  const [offerForm, setOfferForm] = useState({
    scope: "all", // 'all' | 'category' | 'item'
    category: "",
    item: "", // New field for selected item
    type: "percent", // 'percent' | 'flat'
    amount: "",
  });

  const categoryList = useMemo(() => {
    try {
      return Object.keys(menu || {}).sort((a, b) => a.localeCompare(b));
    } catch {
      return [];
    }
  }, [menu]);

  // All item names across categories for select dropdowns
  const allItems = useMemo(() => {
    try {
      const set = new Set();
      Object.values(menu || {}).forEach((arr) => {
        (arr || []).forEach((item) => {
          if (item && item.name) set.add(item.name);
        });
      });
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    } catch {
      return [];
    }
  }, [menu]);

  const fetchMenu = useCallback(async () => {
    try {
      const stored = await getMenu();
      // If stored menu exists but is partial, merge with seed so all categories exist.
      // This prevents cases where stored menu only contains one category (eg. Rolls)
      // and an "All Items" offer would then only affect that category.
      const resolved = stored && Object.keys(stored).length > 0 ? { ...menuSeed, ...stored } : menuSeed;
      setMenu(resolved);
      setOfferForm((f) => {
        if (f.category) return f;
        const first = Object.keys(resolved || {})[0] || "";
        return { ...f, category: first };
      });
    } catch (e) {
      console.warn("Failed to load menu data:", e);
      setMenu(menuSeed);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  // Bundle/Combo rules state and API helpers
  const [rules, setRules] = useState([]);
  const [rulesBusy, setRulesBusy] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    type: 'buy_x_get_y',
    baseName: '',
    baseQuantity: 2,
    rewardName: '',
    rewardPrice: 0,
    rewardQuantity: 1,
    requiredNames: '', // comma-separated for fixed_combo_price
    comboPrice: '',
    limitPerOrder: 1,
  });

  const fetchRules = useCallback(async () => {
    try {
      const storedRules = await getOffersRules();
      if (Array.isArray(storedRules)) {
        setRules(storedRules);
      } else {
        setRules(offersSeed || []);
      }
    } catch (e) {
      console.warn("Failed to load offers rules:", e);
      setRules(offersSeed || []);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBroadcast = (event) => {
      const type = event.detail?.type;
      if (type === "menu") fetchMenu();
      if (type === "offers") fetchRules();
    };

    const handleStorage = (event) => {
      if (event.key === "localData:menu") fetchMenu();
      if (event.key === "localData:offers") fetchRules();
    };

    window.addEventListener("localData:update", handleBroadcast);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("localData:update", handleBroadcast);
      window.removeEventListener("storage", handleStorage);
    };
  }, [fetchMenu, fetchRules]);

  const saveRule = async () => {
    if (rulesBusy) return;
    try {
      setRulesBusy(true);
      let payload;
      if (ruleForm.type === 'buy_x_get_y') {
  const bq = Number((ruleForm.baseQuantity ?? '').toString().trim() || 0);
        const rq = Number((ruleForm.rewardQuantity ?? '').toString().trim() || 0);
        const rp = Number((ruleForm.rewardPrice ?? '').toString().trim() || 0);
        const isValidBase = allItems.includes(ruleForm.baseName || '');
        const isValidReward = allItems.includes(ruleForm.rewardName || '');
        if (!isValidBase || !isValidReward || bq <= 0 || rq <= 0) {
          setToast('Please select Base and Reward items from the list and provide valid quantities.');
          return;
        }
        payload = {
          id: `rule_${Date.now()}`,
          active: true,
          type: 'buy_x_get_y',
          base: { match: { name: ruleForm.baseName }, quantity: bq },
          reward: { items: [{ name: ruleForm.rewardName, price: rp, quantity: rq }] },
          limitPerOrder: Number((ruleForm.limitPerOrder ?? '').toString().trim() || 1) || 1,
        };
      } else if (ruleForm.type === 'fixed_combo_price') {
        const names = (ruleForm.requiredNames || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const price = Number(ruleForm.comboPrice || 0);
        if (names.length < 2 || price <= 0) {
          setToast('Enter at least two required item names and a valid combo price.');
          return;
        }
        payload = {
          id: `rule_${Date.now()}`,
          active: true,
          type: 'fixed_combo_price',
          required: names.map((n) => ({ name: n })),
          price,
          limitPerOrder: Number(ruleForm.limitPerOrder || 1) || 1,
        };
      } else {
        setToast('Unsupported rule type');
        return;
      }
      // Save locally using localDataService
      const updatedRules = [...rules, payload];
      await saveOffersRules(updatedRules);
      setRules(updatedRules);
      setToast('Rule added');
      setRuleForm({ type: ruleForm.type, baseName: '', baseQuantity: 2, rewardName: '', rewardPrice: 0, rewardQuantity: 1, requiredNames: '', comboPrice: '', limitPerOrder: 1 });
    } catch (e) {
      setToast(e.message || 'Failed to save rule');
    } finally {
      setRulesBusy(false);
    }
  };

  const toggleRuleActive = async (rule) => {
    if (rulesBusy) return;
    try {
      setRulesBusy(true);
      const updatedRules = rules.map(r => r.id === rule.id ? { ...r, active: !r.active } : r);
      await saveOffersRules(updatedRules);
      setRules(updatedRules);
    } catch (e) {
      setToast(e.message || 'Failed to update rule');
    } finally {
      setRulesBusy(false);
    }
  };

  const deleteRule = async (rule) => {
    if (rulesBusy) return;
    const ok = typeof window !== 'undefined' ? window.confirm('Delete this rule?') : true;
    if (!ok) return;
    try {
      setRulesBusy(true);
      const updatedRules = rules.filter(r => r.id !== rule.id);
      await saveOffersRules(updatedRules);
      setRules(updatedRules);
      setToast('Rule deleted');
    } catch (e) {
      setToast(e.message || 'Failed to delete rule');
    } finally {
      setRulesBusy(false);
    }
  };

  const currentOfferInfo = useMemo(() => {
    try {
      const categories = Object.keys(menu || {});
      const affected = [];
      const affectedCategories = new Set();
      for (const c of categories) {
        for (const p of menu[c] || []) {
          if (typeof p.originalPrice === 'number' && p.originalPrice > (p.price ?? 0)) {
            affected.push({ c, p });
            affectedCategories.add(c);
          }
        }
      }
      const count = affected.length;
      if (count === 0) return { count: 0, categories: [], sample: null };
      const sample = affected[0];
      const base = sample.p.originalPrice;
      const now = sample.p.price ?? 0;
      const savings = Math.max(0, Math.round(base - now));
      const pct = base > 0 ? Math.round((savings / base) * 100) : 0;
      return { count, categories: Array.from(affectedCategories), sample: { name: sample.p.name, base, now, savings, pct } };
    } catch {
      return { count: 0, categories: [], sample: null };
    }
  }, [menu]);

  const activeRules = useMemo(() => {
    try {
      return (rules || []).filter((r) => r && r.active !== false);
    } catch {
      return [];
    }
  }, [rules]);

  const deactivateAllRules = async () => {
    if (rulesBusy) return;
    try {
      setRulesBusy(true);
      const updatedRules = rules.map(r => ({ ...r, active: false }));
      await saveOffersRules(updatedRules);
      setRules(updatedRules);
      setToast('All bundle/combo rules deactivated');
    } catch (e) {
      setToast(e.message || 'Failed to deactivate rules');
    } finally {
      setRulesBusy(false);
    }
  };

  const ImpactPreview = () => {
    try {
      const cats = offerForm.scope === "category" ? [offerForm.category] : Object.keys(menu || {});
      const products = cats.flatMap((c) => menu?.[c] || []);
      const count = products.length;
      if (count === 0) {
        return (
          <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-1">
            No products found for the selected scope.
          </div>
        );
      }
      const sample = products[0];
      const base = typeof sample?.originalPrice === "number" ? sample.originalPrice : sample?.price ?? 0;
      const amt = Number(offerForm.amount);
      let after = base;
      if (!Number.isNaN(amt) && amt > 0) {
        after = offerForm.type === "percent" ? Math.max(0, Math.round(base * (1 - amt / 100))) : Math.max(0, Math.round(base - amt));
      }
      return (
        <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded px-2 py-1">
          Affects <span className="font-semibold">{count}</span> item{count !== 1 ? "s" : ""}
          {sample?.name ? <span> • Example: {sample.name} ₹{base} → ₹{after}</span> : null}
        </div>
      );
    } catch {
      return null;
    }
  };

  const applyOffers = async () => {
    if (offersBusy || offerType !== "discount") return;
    const amt = Number(offerForm.amount);
    if (Number.isNaN(amt) || amt <= 0) {
      setToast("Enter a valid amount");
      return;
    }
    try {
      setOffersBusy(true);
      // Apply offers locally by modifying menu data
      const updatedMenu = { ...menu };
      const categories = offerForm.scope === "category" ? [offerForm.category] : Object.keys(menu);
      for (const cat of categories) {
        if (updatedMenu[cat]) {
          updatedMenu[cat] = updatedMenu[cat].map(item => {
            if (offerForm.scope === "item" && item.name !== offerForm.item) return item;
            if (typeof item.price !== 'number') return item;
            const originalPrice = item.originalPrice || item.price;
            const newPrice = offerForm.type === "percent"
              ? Math.max(0, Math.round(originalPrice * (1 - amt / 100)))
              : Math.max(0, Math.round(originalPrice - amt));
            return { ...item, price: newPrice, originalPrice };
          });
        }
      }
      // Save updated menu
      await saveMenu(updatedMenu);
      setMenu(updatedMenu);
      setToast("Offers applied");
      router.push({ pathname: "/admin-unified", query: { tab: "Products" } });
    } catch (e) {
      setToast("Failed to apply offers");
    } finally {
      setOffersBusy(false);
    }
  };

  const revertOffers = async () => {
    if (offersBusy) return;
    try {
      setOffersBusy(true);
      // Revert offers by restoring original prices
      const updatedMenu = { ...menu };
      const categories = offerForm.scope === "category" ? [offerForm.category] : Object.keys(menu);
      for (const cat of categories) {
        if (updatedMenu[cat]) {
          updatedMenu[cat] = updatedMenu[cat].map(item => {
            if (offerForm.scope === "item" && item.name !== offerForm.item) return item;
            if (item.originalPrice) {
              return { ...item, price: item.originalPrice };
            }
            return item;
          });
        }
      }
      await saveMenu(updatedMenu);
      setMenu(updatedMenu);
      setToast("Offers reverted");
      router.push({ pathname: "/admin-unified", query: { tab: "Products" } });
    } catch (e) {
      setToast("Failed to revert offers");
    } finally {
      setOffersBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[960px] px-4 py-4">
        {toast && <Toast message={toast} onClose={() => setToast("")} />}

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-800">Apply Offers</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/admin-offers-current')}
              className="px-3.5 py-2 rounded-full text-sm font-medium bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100"
            >
              Current Offers
            </button>
            <button
              onClick={() => router.push({ pathname: "/admin-unified", query: { tab: "Products" } })}
              className="px-3.5 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200"
            >
              Back to Products
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[260px,1fr]">
          {/* Offer Type Browser */}
          <div className="rounded-md border border-gray-200 bg-gray-50 p-2 h-full">
            <div className="text-xs font-semibold text-gray-600 px-2 py-1">Offer Types</div>
            {[
              { id: "discount", title: "Discount-Based", desc: "Percent or flat markdown on menu prices.", enabled: true },
              { id: "bundle", title: "Bundle/Combo", desc: "Buy X get Y or meal deals.", enabled: true },
              { id: "time", title: "Time/Promotional", desc: "Happy hour or seasonal promos.", enabled: false },
              { id: "loyalty", title: "Loyalty/Customer", desc: "Promo codes, repeat perks.", enabled: false },
              { id: "inventory", title: "Inventory-Clearing", desc: "Discounts for overstock.", enabled: false },
            ].map((t) => {
              const active = offerType === t.id;
              const disabled = !t.enabled;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setOfferType(t.id)}
                  className={`w-full text-left px-3 py-2 rounded-md mb-1 ${
                    active ? "bg-white border border-orange-300" : "hover:bg-white"
                  } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                  title={t.desc}
                >
                  <div className="text-sm font-medium text-gray-800">{t.title}</div>
                  <div className="text-xs text-gray-600">
                    {t.desc}
                    {disabled ? " • Coming soon" : ""}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Pane */}
          <div className="space-y-3">
            {offerType !== "discount" && offerType !== 'bundle' && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded p-3 text-sm">
                This offer type is planned but not yet enabled. Use Discount-Based for menu markdowns.
              </div>
            )}

            {offerType === 'bundle' && (
              <div className="space-y-4">
                <div className="text-sm text-gray-700">Bundle/Combo rules are order-level and don’t change menu prices. We’ll apply them at checkout and in admin order totals (display-only) in the next step.</div>
                {/* Rule Form */}
                <div className="border border-gray-200 rounded-md p-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rule Type</label>
                      <select
                        value={ruleForm.type}
                        onChange={(e) => setRuleForm((f) => ({ ...f, type: e.target.value }))}
                        className="w-full bg-white border border-gray-300 rounded-md px-2 py-2 text-sm outline-none focus:border-orange-400 text-black"
                      >
                        <option value="buy_x_get_y">Buy X Get Y</option>
                        <option value="fixed_combo_price">Fixed Combo Price</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Limit Per Order</label>
                      <input
                        type="number"
                        min="1"
                        value={ruleForm.limitPerOrder}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRuleForm((f) => ({ ...f, limitPerOrder: v }));
                        }}
                        onFocus={(e) => e.target.select()}
                        className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-orange-400 text-black"
                      />
                    </div>
                  </div>

                  {ruleForm.type === 'buy_x_get_y' ? (
                    <div className="grid md:grid-cols-3 gap-3 mt-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Base Item</label>
                        <select
                          value={ruleForm.baseName || ''}
                          onChange={(e) => setRuleForm((f) => ({ ...f, baseName: e.target.value }))}
                          className="w-full bg-white border border-gray-300 rounded-md px-2 py-2 text-sm outline-none focus:border-orange-400 text-black"
                        >
                          <option value="">Select item…</option>
                          {allItems.map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Base Quantity (X)</label>
                        <input
                          type="number"
                          min="1"
                          value={ruleForm.baseQuantity}
                          onChange={(e) => {
                            const v = e.target.value;
                            setRuleForm((f) => ({ ...f, baseQuantity: v }));
                          }}
                          onFocus={(e) => e.target.select()}
                          className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-orange-400 text-black"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reward Item (Y)</label>
                        <select
                          value={ruleForm.rewardName || ''}
                          onChange={(e) => setRuleForm((f) => ({ ...f, rewardName: e.target.value }))}
                          className="w-full bg-white border border-gray-300 rounded-md px-2 py-2 text-sm outline-none focus:border-orange-400 text-black"
                        >
                          <option value="">Select item…</option>
                          {allItems.map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reward Price</label>
                        <input
                          type="number"
                          min="0"
                          value={ruleForm.rewardPrice}
                          onChange={(e) => {
                            const v = e.target.value;
                            setRuleForm((f) => ({ ...f, rewardPrice: v }));
                          }}
                          onFocus={(e) => e.target.select()}
                          className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-orange-400 text-black"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reward Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={ruleForm.rewardQuantity}
                          onChange={(e) => {
                            const v = e.target.value;
                            setRuleForm((f) => ({ ...f, rewardQuantity: v }));
                          }}
                          onFocus={(e) => e.target.select()}
                          className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-orange-400 text-black"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-3 gap-3 mt-3">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Required Items (names, comma-separated)</label>
                        <input value={ruleForm.requiredNames} onChange={(e) => setRuleForm((f) => ({ ...f, requiredNames: e.target.value }))} placeholder="e.g., Chicken Burger, Orange Juice" className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-orange-400 text-black" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Combo Price (₹)</label>
                        <input type="number" min="1" value={ruleForm.comboPrice} onChange={(e) => setRuleForm((f) => ({ ...f, comboPrice: e.target.value }))} className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-orange-400 text-black" />
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex justify-end">
                    <button type="button" onClick={saveRule} disabled={rulesBusy} className={`px-3.5 py-2 rounded-md text-sm font-medium ${rulesBusy ? 'bg-gray-200 text-gray-500' : 'bg-orange-500 text-white hover:bg-orange-600'}`}>Add Rule</button>
                  </div>
                </div>

                {/* Rules List */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Existing Rules</h3>
                  {rules.length === 0 ? (
                    <div className="text-sm text-gray-500">No rules yet.</div>
                  ) : (
                    <ul className="space-y-2">
                      {rules.map((r) => (
                        <li key={r.id} className="border border-gray-200 rounded-md p-2 flex items-center justify-between">
                          <div className="text-sm text-gray-800">
                            <div className="font-medium">{r.type === 'buy_x_get_y' ? 'Buy X Get Y' : r.type === 'fixed_combo_price' ? 'Fixed Combo Price' : r.type}</div>
                            <div className="text-xs text-gray-600">
                              {r.type === 'buy_x_get_y' && `Buy ${r.base?.quantity} x ${r.base?.match?.name || r.base?.match?.category} → Get ${r.reward?.items?.[0]?.quantity || 1} x ${r.reward?.items?.[0]?.name} @ ₹${r.reward?.items?.[0]?.price ?? 0}`}
                              {r.type === 'fixed_combo_price' && `Required: ${(r.required || []).map((x) => x.name || x.category).join(', ')} → ₹${r.price}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => toggleRuleActive(r)} disabled={rulesBusy} className={`px-2.5 py-1 rounded-md text-xs font-medium ${r.active !== false ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>{r.active !== false ? 'Active' : 'Inactive'}</button>
                            <button type="button" onClick={() => deleteRule(r)} disabled={rulesBusy} className={`px-2.5 py-1 rounded-md text-xs font-medium ${rulesBusy ? 'bg-red-200 text-white' : 'bg-red-600 text-white hover:bg-red-700'}`}>Delete</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Scope */}
            {offerType === 'discount' && (
            <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOfferForm((f) => ({ ...f, scope: "all" }))}
                  className={`px-3 py-1.5 text-sm rounded-full font-medium ${
                    offerForm.scope === "all" ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  All Items
                </button>
                <button
                  type="button"
                  onClick={() => setOfferForm((f) => ({ ...f, scope: "category", category: categoryList[0] || "" }))}
                  className={`px-3 py-1.5 text-sm rounded-full font-medium ${
                    offerForm.scope === "category" ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  Single Category
                </button>
                {/* New button for Select Item */}
                <button
                  type="button"
                  onClick={() => setOfferForm((f) => ({ ...f, scope: "item" }))}
                  className={`px-3 py-1.5 text-sm rounded-full font-medium ${
                    offerForm.scope === "item" ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  Select Item
                </button>
              </div>

              {/* Conditional rendering for Category select (existing) */}
              {offerForm.scope === "category" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={offerForm.category}
                    onChange={(e) => setOfferForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full bg-white border border-gray-300 rounded-md px-2 py-2 text-sm outline-none focus:border-orange-400 text-black"
                  >
                    {categoryList.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* New conditional rendering for Item select */}
              {offerForm.scope === "item" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Item</label>
                  <select
                    value={offerForm.item || ''}
                    onChange={(e) => setOfferForm((f) => ({ ...f, item: e.target.value }))}
                    className="w-full bg-white border border-gray-300 rounded-md px-2 py-2 text-sm outline-none focus:border-orange-400 text-black"
                  >
                    <option value="">Select an item...</option>
                    {allItems.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Discount kind and amount */}
            <div className={`grid grid-cols-2 gap-2 ${offerType !== 'discount' ? 'hidden' : ''}`}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Kind</label>
                <select
                  value={offerForm.type}
                  onChange={(e) => setOfferForm((f) => ({ ...f, type: e.target.value }))}
                  disabled={offerType !== "discount"}
                  className={`w-full bg-white border border-gray-300 rounded-md px-2 py-2 text-sm outline-none focus:border-orange-400 text-black ${
                    offerType !== "discount" ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  <option value="percent">Percent %</option>
                  <option value="flat">Flat ₹</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={offerForm.amount}
                  onChange={(e) => setOfferForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder={offerForm.type === "percent" ? "e.g. 10" : "e.g. 20"}
                  disabled={offerType !== "discount"}
                  className={`w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-orange-400 text-black ${
                    offerType !== "discount" ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex-1 mr-3">
                {offerType === 'discount' ? <ImpactPreview /> : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={applyOffers}
                  className={`px-3.5 py-2 rounded-md text-sm font-medium ${
                    offersBusy || offerType !== "discount"
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-orange-500 text-white hover:bg-orange-600"
                  }`}
                  disabled={offersBusy || offerType !== "discount"}
                >
                  {offersBusy ? "Applying…" : "Apply"}
                </button>
                <button
                  type="button"
                  onClick={revertOffers}
                  className={`px-3.5 py-2 rounded-md text-sm font-medium border ${
                    offersBusy ? "bg-gray-100 text-gray-400 border-gray-200" : "bg-white text-gray-800 hover:bg-gray-100 border-gray-300"
                  }`}
                  disabled={offersBusy}
                >
                  Revert
                </button>
                <button
                  type="button"
                  onClick={() => router.push({ pathname: "/admin-unified", query: { tab: "Products" } })}
                  className="px-3.5 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
            </>
            )}
          </div>
        </div>
      </div>

      {/* Current Offer modal removed in favor of dedicated page */}
    </div>
  );
}
