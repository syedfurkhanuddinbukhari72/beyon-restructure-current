import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function CheckOrderStatusPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const savedOrder = localStorage.getItem("lastOrder");
    if (savedOrder) {
      const orderObj = JSON.parse(savedOrder);
      router.replace(`/order-status?id=${orderObj._id}`);
    } else {
      setError("No recent order found. Please place an order first to check your order status.");
      setCountdown(5);
    }
  }, [router]);

  useEffect(() => {
    if (error && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
    if (error && countdown === 0) {
      router.replace("/");
    }
  }, [error, countdown, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-200">
      <div className="bg-white shadow-xl rounded-xl p-8 w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-6 text-purple-700">Check Your Order Status</h1>
        {error ? (
          <>
            <div className="text-red-500 mb-4">{error}</div>
            <div className="text-gray-600">Redirecting to menu in <span className="font-bold">{countdown}</span> seconds...</div>
          </>
        ) : (
          <div className="text-gray-600">Redirecting to your latest order status...</div>
        )}
      </div>
    </div>
  );
}
