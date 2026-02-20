import React, { useEffect, useRef } from "react";

export default function ProductEditModal({ state, onClose, onChange, onSubmit }) {
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (!state.open) return;
    const handler = (event) => {
      if (event.key === 'Escape' && !state.busy) {
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [state.open, state.busy, onClose]);

  React.useEffect(() => {
    if (state.open && inputRef.current) {
      setTimeout(() => {
        try { inputRef.current?.focus(); } catch (e) {}
      }, 0);
    }
  }, [state.open, state.mode]);

  if (!state.open) return null;

  const isPriceMode = state.mode === 'price';
  const title = isPriceMode ? `Update price for ${state.product?.name ?? ''}` : `Rename ${state.product?.name ?? ''}`;
  const label = isPriceMode ? 'Price' : 'Name';
  const helper = isPriceMode ? 'Enter the new price (numbers only).' : 'Enter the new name.';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => { if (!state.busy) onClose(); }} />
      <div className="relative w-[min(420px,90%)] bg-white rounded-lg shadow-lg border border-gray-200 p-5 z-10" role="dialog" aria-modal="true">
        <div className="text-lg font-semibold text-gray-800 mb-2">{title}</div>
        <p className="text-sm text-gray-600 mb-4">{helper}</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!state.busy) onSubmit();
          }}
        >
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="product-edit-input">
            {label}
          </label>
          <input
            id="product-edit-input"
            ref={inputRef}
            type={isPriceMode ? 'number' : 'text'}
            step={isPriceMode ? '0.01' : undefined}
            min={isPriceMode ? '0' : undefined}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            value={state.value}
            onChange={(event) => onChange(event.target.value)}
            disabled={state.busy}
            autoComplete="off"
            placeholder={isPriceMode ? 'e.g. 125' : 'Enter value'}
          />
          {state.error ? (
            <div className="mt-2 text-sm text-red-600">{state.error}</div>
          ) : null}
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { if (!state.busy) onClose(); }}
              className="px-3 py-2 rounded-md text-sm bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-50"
              disabled={state.busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-2 rounded-md text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-70"
              disabled={state.busy}
            >
              {state.busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
