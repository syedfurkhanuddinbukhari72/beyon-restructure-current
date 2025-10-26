import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';

// Only import components that use browser APIs on the client side
const DynamicTestOffer = dynamic(
  () => import('../components/TestOffer'),
  { ssr: false }
);

function TestOfferPage() {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const createTestOrder = () => {
    const testOrder = {
      fullCart: [
        {
          name: "Chicken Wrap",
          price: 130,
          quantity: 1,
          isOfferReward: false
        },
        {
          name: "Cheesy Crispy Chicken Sandwich",
          price: 0,
          quantity: 1,
          isOfferReward: true,
          offerId: "buy1get1_wrap_offer"
        }
      ],
      customerName: "Test Customer",
      customerNumber: "9876543210",
      note: "Test order with BOGO offer",
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

  if (!isClient) {
    return <div>Loading...</div>;
  }

  return (
    <DynamicTestOffer 
      status={status}
      setStatus={setStatus}
      createTestOrder={createTestOrder}
    />
  );
}

export default TestOfferPage;
