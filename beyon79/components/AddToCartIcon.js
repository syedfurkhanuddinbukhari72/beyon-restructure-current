import React, { useEffect, useRef, useState } from 'react';

/**
 * AddToCartIcon
 * 32x32 animated add button that morphs + to ✓ with a glowy pulse.
 * Props:
 * - onAdd: () => void
 * - disabled?: boolean
 * - className?: string (for positioning, e.g., absolute bottom-2 right-2)
 * - autoResetMs?: number (default 500)
 */
export default function AddToCartIcon({ onAdd, disabled = false, className = '', autoResetMs = 500 }) {
  const [active, setActive] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleTrigger = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    if (typeof onAdd === 'function') onAdd();

    if (timerRef.current) clearTimeout(timerRef.current);
    setActive(true);
    timerRef.current = setTimeout(() => {
      setActive(false);
    }, autoResetMs);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTrigger(e);
    }
  };

  return (
    <button
      type="button"
      className={`add-icon ${active ? 'active' : ''} ${disabled ? 'add-icon--disabled' : ''} ${className}`}
      aria-label={disabled ? 'Add disabled' : 'Add to cart'}
      onClick={handleTrigger}
      onKeyDown={handleKeyDown}
      disabled={disabled}
    >
      {/* Increase circle diameter by exactly 10% relative to original (r: 49 -> 53.9).
          Expand the viewBox to fit the larger circle without CSS transforms, preserving perfect curvature. */}
      <svg viewBox="-3.9 -3.9 107.8 107.8" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle className="add-icon__circle" cx="50" cy="50" r="53.9" />
        {/* Keep the plus and check at the same visual size by scaling them by the viewBox ratio (107.8/100 = 1.078). */}
        <g transform="translate(50,50) scale(1.078) translate(-50,-50)">
          <path className="add-icon__plus" d="M50 20 L50 80 M20 50 L80 50" />
          <path className="add-icon__check" d="M28 50 L43 65 L72 33" />
        </g>
      </svg>
    </button>
  );
}
