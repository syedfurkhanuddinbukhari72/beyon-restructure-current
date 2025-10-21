"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function OffersHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState([]);
  const [toast, setToast] = useState('');
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState([]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const historyData = (await import("../data/offers-history.json")).default;
      setHistory(historyData || []);
    } catch (e) {
      console.warn("Failed to load offers history:", e);
      setToast('Failed to fetch history');
    } finally { setLoading(false); }
  };

  const fetchRules = async () => {
    try {
      const offersData = (await import("../data/offers.json")).default;
      setRules(offersData || []);
    } catch (e) {
      console.warn("Failed to load offers rules:", e);
      // ignore for display enrichment
    }
  };

  useEffect(() => { fetchHistory(); fetchRules(); }, []);

  const renewFromHistory = async (entry) => {
    // Disabled for offline mode
    setToast('Renew not available in offline mode');
  };

  const clearHistory = async () => {
    // Disabled for offline mode
    setToast('Clear history not available in offline mode');
  };

  const formatCurrency = (n) => {
    const num = Number(n);
    if (Number.isNaN(num)) return String(n);
    return `₹${num}`;
  };

  const getRuleById = (id) => Array.isArray(rules) ? rules.find((r) => r.id === id) : undefined;

  const ruleSummary = (rule) => {
    if (!rule) return 'Offer (details unavailable)';
    if (rule.type === 'buy_x_get_y') {
      const baseMatch = rule?.base?.match || {};
      const baseTarget = baseMatch.name || (baseMatch.category ? `category "${baseMatch.category}"` : 'items');
      const baseQty = rule?.base?.quantity || 1;
      const rewards = (rule?.reward?.items || []).map((r) => `${r.quantity || 1} x ${r.name}${Number(r.price) ? ` @ ${formatCurrency(r.price)}` : ' (free)'}`).join(', ');
      const lim = rule?.limitPerOrder ? ` (limit per order: ${rule.limitPerOrder})` : '';
      return `Buy ${baseQty} of ${baseTarget} → get ${rewards}${lim}`;
    }
    if (rule.type === 'fixed_combo_price') {
      const reqs = (rule.required || []).map((r) => r.name || (r.category ? `any from "${r.category}"` : 'item')).join(' + ');
      const price = formatCurrency(rule.price || 0);
      const lim = rule?.limitPerOrder ? ` (limit per order: ${rule.limitPerOrder})` : '';
      return `Combo for ${price}: ${reqs}${lim}`;
    }
    return rule.type || 'Offer';
  };

  const formatEntry = (h) => {
    const action = h?.action;
    const p = h?.payload || {};
    if (action === 'discount_apply') {
      const amt = p.type === 'percent' ? `${p.amount}%` : `${formatCurrency(p.amount)}`;
      const scope = p.scope === 'category' && p.category ? `category "${p.category}"` : 'all categories';
      return { title: 'Discount applied', desc: `${amt} off on ${scope}` };
    }
    if (action === 'discount_revert') {
      const scope = p.scope === 'category' && p.category ? `category "${p.category}"` : 'all categories';
      return { title: 'Discount reverted', desc: `Restored original prices for ${scope}` };
    }
    if (action === 'rule_deactivate') {
      const rule = getRuleById(p.id);
      return { title: 'Offer deactivated', desc: ruleSummary(rule) };
    }
    return { title: action || 'History', desc: p && Object.keys(p).length ? JSON.stringify(p) : '' };
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[960px] px-4 py-4">
        {toast && (
          <div className="fixed bottom-5 right-5 bg-orange-600 text-white px-4 py-2 rounded shadow" onAnimationEnd={() => setToast('')}>{toast}</div>
        )}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-800">Offers History</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/admin-offers-current')} className="px-3.5 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200">Back to Current Offers</button>
            <button onClick={() => router.push('/admin-offers')} className="px-3.5 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800 hover:bg-orange-500 hover:text-white transition-colors">Back to Apply Offers</button>
          </div>
        </div>

        <div className="border border-gray-200 rounded-md p-3">
          {loading ? (
            <div className="text-sm text-gray-600">Loading…</div>
          ) : history.length === 0 ? (
            <div className="text-sm text-gray-600">No history recorded yet.</div>
          ) : (
            <ul className="space-y-1 text-sm text-gray-800">
              {history.map((h) => {
                const fe = formatEntry(h);
                return (
                  <li key={h.id} className="flex items-center justify-between border border-gray-100 rounded px-2 py-1">
                    <div className="min-w-0 mr-2">
                      <div className="font-medium text-gray-900">{fe.title}</div>
                      {fe.desc ? <div className="text-gray-600 break-words">{fe.desc}</div> : null}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-500">{new Date(h.ts).toLocaleString()}</span>
                      {(h.action === 'discount_apply' || h.action === 'rule_deactivate') && (
                        <button onClick={() => renewFromHistory(h)} disabled={busyId === h.id} className={`px-2.5 py-1 rounded-md text-xs font-medium ${busyId === h.id ? 'bg-gray-200 text-gray-500' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>Renew</button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
