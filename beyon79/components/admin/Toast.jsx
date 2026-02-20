import React, { useEffect } from "react";

export default function Toast({ message, onClose, type = "error" }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getToastStyles = () => {
    switch (type) {
      case "success":
        return "bg-green-600 text-white";
      case "error":
        return "bg-red-600 text-white";
      case "warning":
        return "bg-yellow-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  return (
    <div
      style={{ position: "fixed", bottom: 20, right: 20, zIndex: 1000 }}
      className={`${getToastStyles()} px-4 py-2 rounded shadow-lg`}
    >
      {message}
    </div>
  );
}
