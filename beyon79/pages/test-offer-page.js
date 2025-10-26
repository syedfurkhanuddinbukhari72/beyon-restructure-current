import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function TestOfferPage() {
  const router = useRouter();
  const [status, setStatus] = useState('');

  const createTestOrder = () => {
    const testOrder = {
      fullCart: [
        {
          name: "Chicken Wrap",
          price: 130,
          quantity: 2,
          isOfferReward: false
        },
        {
          name: "Paneer Burger",
          price: 0,
          quantity: 1,
          isOfferReward: true,
          offerId: "buy2_wrap_get1_paneer"
        }
      ],
      customerName: "Test Customer",
      customerNumber: "9876543210",
      note: "Test order with offer",
      createdAt: new Date().toISOString(),
      id: `test-${Date.now()}`
    };

    try {
      localStorage.setItem('manual_latest_order', JSON.stringify(testOrder));
      setStatus('Test order created successfully!');
      setTimeout(() => {
        router.push('/bill');
      }, 1000);
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Test Offer Application</h1>
      <p>This page helps test the Buy 2 Chicken Wrap, Get 1 Paneer Burger offer.</p>
      
      <div style={{ margin: '20px 0', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
        <h3>Test Order:</h3>
        <ul>
          <li>2 × Chicken Wrap (₹130 each)</li>
          <li>1 × Paneer Burger (Free with offer)</li>
        </ul>
        <p>Expected Total: ₹200</p>
      </div>

      <button 
        onClick={createTestOrder}
        style={{
          padding: '10px 20px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px',
          marginTop: '10px'
        }}
      >
        Create Test Order & View Bill
      </button>

      {status && (
        <div style={{ marginTop: '20px', color: status.startsWith('Error') ? '#ef4444' : '#10b981' }}>
          {status}
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
        <h3>Debug Information:</h3>
        <button 
          onClick={() => {
            const order = localStorage.getItem('manual_latest_order');
            console.log('Current order in localStorage:', JSON.parse(order || '{}'));
            setStatus('Check browser console for order details');
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#e2e8f0',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          View Current Order in Console
        </button>
      </div>
    </div>
  );
}
