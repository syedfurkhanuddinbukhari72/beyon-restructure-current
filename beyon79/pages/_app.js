import "@/styles/globals.css";
import ErrorBoundary from "../src/ErrorBoundary";
import Head from "next/head";
import '../src/shortcutHandler';

// Polyfill Node.js `global` for browser
if (typeof global === 'undefined') {
  window.global = window;
}

export default function App({ Component, pageProps }) {
  // Listen for forwarded app-shortcut messages and handle global actions like go_back
  if (typeof window !== 'undefined') {
    window.addEventListener('message', (ev) => {
      try {
        const d = ev.data || {};
        if (d.type !== 'beyon:app-shortcut') return;
        const payload = d.payload || {};
        const action = payload.action;
        try { window.__beyon_shortcut_handler && typeof window.__beyon_shortcut_handler.showOverlay === 'function' && window.__beyon_shortcut_handler.showOverlay(action); } catch (e) {}
        if (action === 'go_back') {
          try {
            if (window.history && window.history.length > 1) {
              window.history.back();
            } else {
              window.location.href = '/';
            }
          } catch (e) {}
        }
      } catch (e) {}
    });
  }
  return (
    <ErrorBoundary>
      <>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <Component {...pageProps} />
      </>
    </ErrorBoundary>
  );
}
