import "@/styles/globals.css";
import ErrorBoundary from "../src/ErrorBoundary";
import Head from "next/head";

// Polyfill Node.js `global` for browser
if (typeof global === 'undefined') {
  window.global = window;
}

export default function App({ Component, pageProps }) {
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
