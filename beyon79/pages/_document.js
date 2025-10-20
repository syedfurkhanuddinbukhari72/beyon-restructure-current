import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  const isProd = process.env.NODE_ENV === 'production';
  return (
    <Html>
      <Head>
          {/* Ensure relative asset paths so file:// served exported pages can load JS/CSS */}
          <base href="./" />
        {/* Polyfill Node.js global for browser before Next.js scripts */}
        <script dangerouslySetInnerHTML={{ __html: `if (typeof global === 'undefined') window.global = window;` }} />
        {isProd && (
          <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';" />
        )}
        {/* Removed viewport meta tag to avoid warnings */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
