import dynamic from 'next/dynamic';
import '@/styles/globals.css';
import PerformanceMonitor from '@/utils/performanceMonitor';
import React from 'react';

const ErrorBoundary = dynamic(() => import('../src/ErrorBoundary'), {
  ssr: false,
  loading: () => <div style={{ minHeight: '100vh' }} />
});

// Initialize performance monitoring
const performanceMonitor = new PerformanceMonitor();

export default function App({ Component, pageProps }) {
  // Measure page load performance
  React.useEffect(() => {
    performanceMonitor.measurePageLoad();
    
    // Log metrics after a delay to ensure all measurements are captured
    const timer = setTimeout(() => {
      performanceMonitor.logMetrics();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary>
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}
