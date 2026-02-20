"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();
  
  // Immediate redirect to admin page for the APK
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/admin-unified');
    }, 100);
    return () => clearTimeout(timer);
  }, [router]);

  // Show loading while redirecting
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontSize: '18px',
      backgroundColor: '#f5f5f5',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div className="lds-ring--sm" style={{ color: '#f97316' }}>
        <div></div><div></div><div></div><div></div>
      </div>
      <span style={{ marginLeft: '12px' }}>Loading Admin Panel...</span>
    </div>
  );
}