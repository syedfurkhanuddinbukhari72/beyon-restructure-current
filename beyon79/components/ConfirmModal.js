"use client";

import React from "react";

export default function ConfirmModal({ open, title, message, confirmText = "Confirm", cancelText = "Cancel", busy = false, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-[min(640px,90%)] bg-white rounded-lg shadow-lg border border-gray-200 p-5 z-10">
        <div className="text-lg font-semibold text-gray-800 mb-2">{title}</div>
        <div className="text-sm text-gray-700 mb-4 whitespace-pre-wrap">{message}</div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} disabled={busy} className="px-3 py-2 rounded-md text-sm bg-gray-100 text-gray-800 hover:bg-gray-200">
            {cancelText}
          </button>
          <button onClick={onConfirm} disabled={busy} className={`px-3 py-2 rounded-md text-sm font-medium ${busy ? 'bg-gray-200 text-gray-500' : 'bg-red-600 text-white hover:bg-red-700'}`}>
            {busy ? 'Working…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
