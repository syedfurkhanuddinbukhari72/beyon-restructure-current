"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { saveOffersRules, saveMenu } from "../src/localDataService";

export default function CurrentOffersPage() {
  const router = useRouter();
  const [menu, setMenu] = useState({});
  const [rules, setRules] = useState([]);
  const [history, setHistory] = useState([]);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // For discount removal
  const [revertScope, setRevertScope] = useState('all');
  const [revertCategory, setRevertCategory] = useState('');

  // For rule deactivation
  const [selectedRuleId, setSelectedRuleId] = useState('');

  const fetchMenu = async () => {
    try {
      const data = (await import("../data/menuData.json")).default;
      setMenu(data);
    } catch (e) {
      console.warn("Failed to load menu data:", e);
    }
  };
  const fetchRules = async () => {
    try {
      const offersData = (await import("../data/offers.json")).default;
      setRules(offersData || []);
    } catch (e) {
      console.warn("Failed to load offers rules:", e);
    }
  };
  const fetchHistory = async () => {
    try {
      const historyData = (await import("../data/offers-history.json")).default;
      setHistory(historyData || []);
    } catch (e) {
      console.warn("Failed to load offers history:", e);
    }
  };

  useEffect(() => {
    fetchMenu();
    fetchRules();
    fetchHistory();
  }, []);

  const categoryList = useMemo(() => {
    try { return Object.keys(menu || {}); } catch { return []; }
  }, [menu]);

  const currentDiscountInfo = useMemo(() => {
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

  const activeRules = useMemo(() => (rules || []).filter((r) => r && r.active !== false), [rules]);

  // History renew helpers
  const [renewBusyId, setRenewBusyId] = useState('');
  const renewFromHistory = async (entry) => {
    if (!entry || renewBusyId) return;
    try {
      setRenewBusyId(entry.id);
      if (entry.action === 'discount_apply') {
        // For offline mode, renew functionality is disabled
        setToast('Renew functionality disabled in offline mode');
      } else if (entry.action === 'rule_deactivate') {
        // For offline mode, renew functionality is disabled
        setToast('Renew functionality disabled in offline mode');
      }
    } catch (e) {
      setToast(e.message || 'Failed to renew from history');
    } finally {
      setRenewBusyId('');
    }
  };

  const doRevertDiscounts = async () => {
    if (busy) return;
    if (revertScope === 'category' && !revertCategory) {
      setToast('Select a category');
      return;
    }
    try {
      setBusy(true);
      // Revert discounts locally by restoring original prices
      const updatedMenu = { ...menu };
      const categories = revertScope === 'category' ? [revertCategory] : Object.keys(menu);
      for (const cat of categories) {
        if (updatedMenu[cat]) {
          updatedMenu[cat] = updatedMenu[cat].map(item => {
            if (item.originalPrice) {
              return { ...item, price: item.originalPrice };
            }
            return item;
          });
        }
      }
      await saveMenu(updatedMenu);
      setMenu(updatedMenu);
      setToast('Discounts reverted');
    } catch (e) {
      setToast(e.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const doDeactivateRule = async () => {
    if (busy) return;
    const rule = activeRules.find(r => (r.id || r._id) === selectedRuleId);
    if (!rule) { setToast('Select a rule'); return; }
    try {
      setBusy(true);
      const updatedRules = rules.map(r => r.id === rule.id ? { ...r, active: false } : r);
      await saveOffersRules(updatedRules);
      setRules(updatedRules);
      setToast('Rule deactivated');
    } catch (e) {
      setToast(e.message || 'Failed');
    } finally { setBusy(false); }
  };

  return (
    <>
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[960px] px-4 py-4">
        {toast && (
          <div className="fixed bottom-5 right-5 bg-orange-600 text-white px-4 py-2 rounded shadow" onAnimationEnd={() => setToast('')}>{toast}</div>
        )}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-800">Current Offers</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/admin-offers')} className="px-3.5 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200">Back to Apply Offers</button>
            <button onClick={() => router.push('/admin-offers-history')} className="px-3.5 py-2 rounded-full text-sm font-medium bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100">History</button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Discounts section */}
          <div className="border border-gray-200 rounded-md p-3">
            <div className="text-sm font-semibold text-gray-900 mb-2">Menu markdowns</div>
            {currentDiscountInfo.count === 0 ? (
              <div className="text-sm text-gray-600">No discount-based offers are currently applied.</div>
            ) : (
              <div className="space-y-2 text-sm text-gray-800">
                <div>Affected items: <span className="font-semibold">{currentDiscountInfo.count}</span></div>
                {currentDiscountInfo.categories.length > 0 && (
                  <div>Categories: {currentDiscountInfo.categories.map((c) => (<span key={c} className="inline-block mr-1 mb-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800 border border-gray-200">{c}</span>))}</div>
                )}
                {currentDiscountInfo.sample && (
                  <div className="bg-red-50 border border-red-200 rounded p-2">Example: <span className="font-semibold">{currentDiscountInfo.sample.name}</span> — ₹{currentDiscountInfo.sample.base} → ₹{currentDiscountInfo.sample.now} (Saved ₹{currentDiscountInfo.sample.savings}{currentDiscountInfo.sample.pct ? `, ${currentDiscountInfo.sample.pct}%` : ''})</div>
                )}
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <select value={revertScope} onChange={(e) => setRevertScope(e.target.value)} className="bg-white border border-gray-300 rounded-md px-2 py-2 text-sm text-black">
                    <option value="all">Revert: All items</option>
                    <option value="category">Revert: Single category</option>
                  </select>
                  {revertScope === 'category' && (
                    <select value={revertCategory} onChange={(e) => setRevertCategory(e.target.value)} className="bg-white border border-gray-300 rounded-md px-2 py-2 text-sm text-black">
                      <option value="">Select category…</option>
                      {categoryList.map((c) => (<option key={c} value={c}>{c}</option>))}
                    </select>
                  )}
                  <button onClick={doRevertDiscounts} disabled={busy} className={`px-3.5 py-2 rounded-md text-sm font-medium ${busy ? 'bg-gray-200 text-gray-500' : 'bg-red-600 text-white hover:bg-red-700'}`}>Remove</button>
                </div>
              </div>
            )}
          </div>

          {/* Bundle/Combo rules */}
          <div className="border border-gray-200 rounded-md p-3">
            <div className="text-sm font-semibold text-gray-900 mb-2">Active bundle/combo rules</div>
            {activeRules.length === 0 ? (
              <div className="text-sm text-gray-600">No active rules.</div>
            ) : (
              <div className="space-y-2 text-sm text-gray-800">
                <ul className="list-disc ml-5 space-y-1">
                  {activeRules.map((r) => (
                    <li key={r.id || r._id || JSON.stringify(r)}>
                      {r.type === 'buy_x_get_y' && (
                        <>Buy {r.base?.quantity || 0} x {r.base?.match?.name || r.base?.match?.category || 'item'} → Get {r.reward?.items?.[0]?.quantity || 1} x {r.reward?.items?.[0]?.name} @ ₹{r.reward?.items?.[0]?.price ?? 0}</>
                      )}
                      {r.type === 'fixed_combo_price' && (
                        <>Combo: ₹{r.price} — Required: {(r.required || []).map((x) => x.name || x.category).join(', ')}</>
                      )}
                      {r.type !== 'buy_x_get_y' && r.type !== 'fixed_combo_price' && <>{r.type}</>}
                    </li>
                  ))}
                </ul>
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <select value={selectedRuleId} onChange={(e) => setSelectedRuleId(e.target.value)} className="bg-white border border-gray-300 rounded-md px-2 py-2 text-sm text-black">
                    <option value="">Select a rule to deactivate…</option>
                    {activeRules.map((r) => (
                      <option key={r.id || r._id} value={r.id || r._id}>
                        {r.type === 'buy_x_get_y' ? `Buy ${r.base?.quantity} x ${r.base?.match?.name || r.base?.match?.category} → Get ${r.reward?.items?.[0]?.quantity || 1} x ${r.reward?.items?.[0]?.name} @ ₹${r.reward?.items?.[0]?.price ?? 0}` : `Combo ₹${r.price}`}
                      </option>
                    ))}
                  </select>
                  <button onClick={doDeactivateRule} disabled={busy} className={`px-3.5 py-2 rounded-md text-sm font-medium ${busy ? 'bg-gray-200 text-gray-500' : 'bg-yellow-600 text-white hover:bg-yellow-700'}`}>Deactivate</button>
                </div>
              </div>
            )}
          </div>

          
        </div>
      </div>
  </div>
    {/* History page is separate; removed inline modal */}
    </>
  );
}
