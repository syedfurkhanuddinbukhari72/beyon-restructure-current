// Global shortcut handler for renderer
// Listens for postMessage events forwarded by the Electron preload and dispatches actions.
if (typeof window !== 'undefined') {
  window.__beyon_shortcut_handler = window.__beyon_shortcut_handler || {};
  if (!window.__beyon_shortcut_handler.inited) {
    window.__beyon_shortcut_handler.inited = true;
    // Track last action/time to avoid duplicate deliveries firing twice
    window.__beyon_shortcut_handler._last = { action: null, ts: 0 };
    window.addEventListener('message', (ev) => {
      try {
        const d = ev.data;
        if (!d) return;
        // Accept both upstream 'app-shortcut' messages (from preload/main)
        // and already-forwarded 'beyon:app-shortcut' messages (in case some
        // sender posts the forwarded type directly). For beyon:app-shortcut
        // just show the overlay and do not re-post to avoid loops.
        if (d.type === 'beyon:app-shortcut') {
          const payload = d.payload || {};
          try { window.__beyon_shortcut_handler && typeof window.__beyon_shortcut_handler.showOverlay === 'function' && window.__beyon_shortcut_handler.showOverlay(payload && payload.action ? String(payload.action) : 'beyon:app-shortcut'); } catch (e) {}
          console.log('[shortcutHandler] received beyon:app-shortcut (no-forward)', payload);
          return;
        }
        if (d.type !== 'app-shortcut') return;
        const payload = d.payload || {};
        // Dedupe: ignore same action within 350ms
        const now = Date.now();
        const last = window.__beyon_shortcut_handler._last || { action: null, ts: 0 };
        if (payload && payload.action && last.action === payload.action && (now - last.ts) < 350) {
          // ignore duplicate
          console.log('[shortcutHandler] duplicate app-shortcut ignored', payload.action);
          return;
        }
        window.__beyon_shortcut_handler._last = { action: payload.action, ts: now };

        // For now just log the action. Specific pages can listen for these events
        console.log('[shortcutHandler] received app-shortcut', payload);

            // Show transient on-screen debug toast for received shortcuts (helps testing)
            try {
              if (window.__beyon_shortcut_handler && typeof window.__beyon_shortcut_handler.showOverlay === 'function') {
                window.__beyon_shortcut_handler.showOverlay(payload && payload.action ? String(payload.action) : 'app-shortcut');
              }
            } catch (e) {}

        // Expose a hook: dispatch via postMessage for better compatibility
        console.log('[shortcutHandler] dispatching via postMessage for', payload);
        try {
          window.postMessage({ type: 'beyon:app-shortcut', payload }, '*');
        } catch (e) {
          console.warn('[shortcutHandler] postMessage failed', e);
        }
      } catch (e) {
        // ignore
      }
    });

    // Local keyboard handler: implement 'm' single/double press shortcuts in the renderer
    // Single 'm' -> open manual orders, Double 'm' (within 400ms) -> open manual order complete
    (function installLocalKeyHandler() {
      let lastMts = 0;
      let mCount = 0;
      const MAX_INTERVAL = 400; // ms

      function isTypingInInput() {
        const el = document.activeElement;
        if (!el) return false;
        const tag = el.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
        if (el.isContentEditable) return true;
        return false;
      }

      // Use keyup + timer approach for reliable single/double detection. Keyup avoids
      // key-repeat noise and lets us cancel a pending single action when a second
      // keyup arrives within the interval.
      (function installKeyupHandler() {
  let mTimer = null;
  let bTimer = null;
  let pTimer = null;
  const INTERVAL = 400; // ms

        window.addEventListener('keyup', (ev) => {
          try {
            if (!ev) return;
            const raw = ev.key || '';
            const key = String(raw).toLowerCase();
            // Only care about m, b, p and Shift+keys here
            if (key !== 'm' && key !== 'b' && key !== 'p' && !(ev.shiftKey && (key === 'c' || key === 'r' || key === 'p' || key === 'a' || key === 'h' || key === 'l'))) return;
            // ignore modifier combos other than Shift
            if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
            if (isTypingInInput()) return;

            // Debug
            console.log('[shortcutHandler] keyup', { key, shiftKey: ev.shiftKey, time: Date.now() });

            if (key === 'm') {
              if (mTimer) {
                clearTimeout(mTimer);
                mTimer = null;
                console.log('[shortcutHandler] double m -> open_manual_order_complete');
                try {
                  try { window.__beyon_shortcut_handler && typeof window.__beyon_shortcut_handler.showOverlay === 'function' && window.__beyon_shortcut_handler.showOverlay('open_manual_order_complete'); } catch (e) {}
                  console.log('[shortcutHandler] posting app-shortcut open_manual_order_complete');
                  window.postMessage({ type: 'app-shortcut', payload: { action: 'open_manual_order_complete' } }, '*');
                } catch (e) {}
              } else {
                mTimer = setTimeout(() => {
                  try { mTimer = null; } catch (e) {}
                  console.log('[shortcutHandler] single m ignored (waiting for double)');
                }, INTERVAL);
              }
            } else if (key === 'b') {
              if (bTimer) {
                clearTimeout(bTimer);
                bTimer = null;
                console.log('[shortcutHandler] double b -> open_bill');
                try {
                  try { window.__beyon_shortcut_handler && typeof window.__beyon_shortcut_handler.showOverlay === 'function' && window.__beyon_shortcut_handler.showOverlay('open_bill'); } catch (e) {}
                  console.log('[shortcutHandler] posting app-shortcut open_bill');
                  window.postMessage({ type: 'app-shortcut', payload: { action: 'open_bill' } }, '*');
                } catch (e) {}
              } else {
                bTimer = setTimeout(() => {
                  try { bTimer = null; } catch (e) {}
                  console.log('[shortcutHandler] single b ignored (waiting for double)');
                }, INTERVAL);
              }
            } else if (key === 'p') {
              if (pTimer) {
                clearTimeout(pTimer);
                pTimer = null;
                console.log('[shortcutHandler] double p -> print_current');
                try {
                  try { window.__beyon_shortcut_handler && typeof window.__beyon_shortcut_handler.showOverlay === 'function' && window.__beyon_shortcut_handler.showOverlay('print_current'); } catch (e) {}
                  console.log('[shortcutHandler] posting app-shortcut print_current');
                  window.postMessage({ type: 'app-shortcut', payload: { action: 'print_current' } }, '*');
                } catch (e) {}
              } else {
                pTimer = setTimeout(() => {
                  try { pTimer = null; } catch (e) {}
                  console.log('[shortcutHandler] single p ignored (waiting for double)');
                }, INTERVAL);
              }
            } else if (ev.shiftKey && key === 'c') {
              ev.preventDefault && ev.preventDefault();
              window.postMessage({ type: 'app-shortcut', payload: { action: 'open_cart' } }, '*');
              console.log('[shortcutHandler] local Shift+C -> open_cart');
            } else if (ev.shiftKey && key === 'r') {
              ev.preventDefault && ev.preventDefault();
              window.postMessage({ type: 'app-shortcut', payload: { action: 'switch_to_ready_tab' } }, '*');
              console.log('[shortcutHandler] local Shift+R -> switch_to_ready_tab');
            } else if (ev.shiftKey && key === 'p') {
              ev.preventDefault && ev.preventDefault();
              window.postMessage({ type: 'app-shortcut', payload: { action: 'switch_to_paid_tab' } }, '*');
              console.log('[shortcutHandler] local Shift+P -> switch_to_paid_tab');
            } else if (ev.shiftKey && key === 'a') {
              ev.preventDefault && ev.preventDefault();
              window.postMessage({ type: 'app-shortcut', payload: { action: 'switch_to_active_tab' } }, '*');
              console.log('[shortcutHandler] local Shift+A -> switch_to_active_tab');
            } else if (ev.shiftKey && key === 'h') {
              ev.preventDefault && ev.preventDefault();
              window.postMessage({ type: 'app-shortcut', payload: { action: 'switch_to_archive_tab' } }, '*');
              console.log('[shortcutHandler] local Shift+H -> switch_to_archive_tab');
            } else if (ev.shiftKey && key === 'l') {
              ev.preventDefault && ev.preventDefault();
              window.postMessage({ type: 'app-shortcut', payload: { action: 'local_mode' } }, '*');
              console.log('[shortcutHandler] local Shift+L -> local_mode');
            }
          } catch (e) {
            // ignore
          }
        }, { capture: false, passive: true });

        // Local keydown handler for Escape -> go back
        window.addEventListener('keydown', (ev) => {
          try {
            if (!ev) return;
            // Ignore modifier combos
            if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.shiftKey) return;
            if (isTypingInInput()) return;

            const key = (ev.key || '').toLowerCase();
            // Escape -> go back (forward to app message handler)
            if (key === 'escape') {
              ev.preventDefault && ev.preventDefault();
              window.postMessage({ type: 'app-shortcut', payload: { action: 'go_back' } }, '*');
              console.log('[shortcutHandler] local Escape -> go_back');
            }
          } catch (e) {
            // ignore
          }
        }, { capture: false, passive: false });
      })();
    })();
  }
}

const shortcutHandler = {};

export default shortcutHandler;

// Install a tiny debug overlay to display incoming shortcut actions. Exposed
// via window.__beyon_shortcut_handler.showOverlay(action)
if (typeof window !== 'undefined') {
  try {
    (function installOverlay() {
      const root = document.createElement('div');
      root.id = 'beyon-shortcut-overlay-root';
      root.style.position = 'fixed';
      root.style.right = '12px';
      root.style.top = '12px';
      root.style.zIndex = 2147483647; // very top
      root.style.pointerEvents = 'none';
      document.body && document.body.appendChild && document.body.appendChild(root);

      function show(text, opts = {}) {
        try {
          if (!root) return;
          const el = document.createElement('div');
          el.className = 'beyon-shortcut-toast';
          el.style.pointerEvents = 'auto';
          el.style.marginTop = '6px';
          el.style.background = 'rgba(17,24,39,0.95)';
          el.style.color = 'white';
          el.style.fontSize = '13px';
          el.style.padding = '8px 10px';
          el.style.borderRadius = '6px';
          el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.3)';
          el.style.opacity = '0';
          el.style.transition = 'opacity 180ms ease, transform 180ms ease';
          el.style.transform = 'translateY(-6px)';
          el.textContent = String(text || 'shortcut');
          root.insertBefore(el, root.firstChild);
          // animate in
          requestAnimationFrame(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
          });
          const ttl = (opts.ttl && Number(opts.ttl)) || 2200;
          setTimeout(() => {
            try {
              el.style.opacity = '0';
              el.style.transform = 'translateY(-6px)';
              setTimeout(() => el.remove(), 220);
            } catch (e) {}
          }, ttl);
        } catch (e) {
          // ignore overlay errors
        }
      }

      // expose helper on the global handler so other code paths can call it
      window.__beyon_shortcut_handler = window.__beyon_shortcut_handler || {};
      let lastShown = { text: null, ts: 0 };
      window.__beyon_shortcut_handler.showOverlay = function (text, opts) {
        try {
          const now = Date.now();
          const t = String(text || '');
          // dedupe identical messages within 500ms
          if (t && lastShown.text === t && (now - (lastShown.ts || 0)) < 500) {
            return;
          }
          lastShown = { text: t, ts: now };
          show(t, opts || {});
        } catch (e) {}
      };
      // Debug helper: programmatically send an app-shortcut (useful for testing)
      window.__beyon_shortcut_handler.sendTest = function (action) {
        try {
          const payload = { action: String(action || '') };
          console.log('[shortcutHandler] sendTest ->', payload);
          window.postMessage({ type: 'app-shortcut', payload }, '*');
        } catch (e) {}
      };
    })();
  } catch (e) {
    // ignore overlay install errors
  }
}
            
