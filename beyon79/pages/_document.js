import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  const isProd = process.env.NODE_ENV === 'production';
  const devHosts = "http://localhost:3000 http://localhost:3001 http://localhost:3002";
  // In production, provide a strict CSP. During development include localhost dev
  // hosts (dev server) and allow 'unsafe-eval' only in dev so source-maps/next dev
  // tooling continue to work. Keep this meta tag minimal and explicit.
  const cspContent = isProd
    ? "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none';"
    : `default-src 'self' ${devHosts}; script-src 'self' 'unsafe-eval' 'unsafe-inline' ${devHosts}; style-src 'self' 'unsafe-inline' ${devHosts}; img-src 'self' data:; connect-src 'self' ${devHosts};`;

  return (
    <Html>
      <Head>
        {/* Ensure relative asset paths so file:// served exported pages can load JS/CSS */}
        <base href="./" />
        {/* Polyfill Node.js global for browser before Next.js scripts */}
        <script dangerouslySetInnerHTML={{ __html: `if (typeof global === 'undefined') window.global = window;` }} />
        <meta httpEquiv="Content-Security-Policy" content={cspContent} />
        {/* Removed viewport meta tag to avoid warnings */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
