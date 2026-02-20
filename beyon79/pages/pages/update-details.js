import { useState } from "react";
import { useRouter } from "next/router";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good evening";
  return "Good night";
}

export default function UpdateDetailsPage() {
  const [name, setName] = useState(typeof window !== "undefined" ? localStorage.getItem("userName") || "" : "");
  const [phone, setPhone] = useState(typeof window !== "undefined" ? localStorage.getItem("userPhone") || "" : "");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleUpdate = () => {
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }
  localStorage.setItem("userName", name);
  localStorage.setItem("userPhone", phone);
  router.replace("/welcome");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-200">
      <div className="bg-white shadow-xl rounded-xl p-8 w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-6 text-purple-700">{getGreeting()}, update your details</h1>
        <input
          type="text"
          className="w-full p-3 border border-purple-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-purple-400"
          placeholder="Enter your name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          type="tel"
          className="w-full p-3 border border-purple-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-purple-400"
          placeholder="Enter your phone number"
          value={phone}
          onChange={e => setPhone(e.target.value)}
        />
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <button
          className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-lg shadow-md hover:scale-105 transition-transform"
          onClick={handleUpdate}
        >
          Update Details
        </button>
      </div>
    </div>
  );
}
