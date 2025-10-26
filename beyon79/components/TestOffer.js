import { useState } from 'react';

export default function TestOffer({ status, setStatus, createTestOrder }) {
  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Test Offer Application</h1>
      <p>This page helps test the Buy 1 Get 1 Free on Chicken Wrap offer.</p>
      
      <div style={{ margin: '20px 0', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
        <h3>Test Order:</h3>
        <ul>
          <li>1 × Chicken Wrap (₹130)</li>
          <li>1 × Cheesy Crispy Chicken Sandwich (Free with offer)</li>
        </ul>
        <p>Expected Total: ₹130</p>
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
            console.log('Current order in localStorage:', order ? JSON.parse(order) : 'No order found');
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
