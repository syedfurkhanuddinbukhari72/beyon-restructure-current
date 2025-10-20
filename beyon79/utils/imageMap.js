// Simple keyword-based image selector using local images only.
// Removed external API dependencies for offline functionality.

const pickKeyword = (name = '', category = '') => {
  const n = String(name).toLowerCase();
  const c = String(category).toLowerCase();

  // Direct item keyword checks - map to local image names
  if (n.includes('shawarma')) return 'shawarma';
  if (n.includes('wrap')) {
    if (n.includes('cheesy') && n.includes('chicken')) return 'cheesy-chicken-wrap';
    if (n.includes('paneer')) return 'paneer-wrap';
    if (n.includes('veg')) return 'veg-wrap';
    return 'cheesy-chicken-wrap'; // default wrap
  }
  if (n.includes('sandwich')) {
    if (n.includes('crispy') && n.includes('chicken')) return 'crispy-chicken-sandwich';
    if (n.includes('cheesy') && n.includes('crispy') && n.includes('chicken')) return 'cheesy-crispy-chicken-sandwich';
    if (n.includes('paneer')) return 'paneer-sandwich';
    if (n.includes('veg')) return 'veg-sandwich';
    return 'crispy-chicken-sandwich'; // default sandwich
  }

  // Keep WhatsApp links for social sharing
  return null; // No external image fallback
};

export const imagePrimaryForItem = (name, category, w = 640, h = 400) => {
  const keyword = pickKeyword(name, category);
  if (keyword) {
    return `/images/menu/${keyword}.jpg`;
  }
  // Return null for items without local images
  return null;
};

export const imageFallbackForItem = (name, _category, w = 640, h = 400) => {
  // No external fallback - return null for offline mode
  return null;
};

export const imagePlaceholderDataUrl = (name, w = 640, h = 400) => {
  const W = Math.max(1, Math.floor(w));
  const H = Math.max(1, Math.floor(h));
  const label = String(name || 'Food');
  const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}' viewBox='0 0 ${W} ${H}'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='#f3f4f6'/><stop offset='100%' stop-color='#e5e7eb'/></linearGradient></defs><rect width='100%' height='100%' fill='url(#g)'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Inter, Arial, sans-serif' font-size='${Math.max(12, Math.floor(Math.min(W, H) * 0.12))}' fill='#9ca3af'>${label}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

// Back-compat default export: primary image URL.
export const imageForItem = imagePrimaryForItem;
export default imagePrimaryForItem;
