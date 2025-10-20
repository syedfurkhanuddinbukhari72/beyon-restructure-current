// Attach local image paths to menu items by name, regardless of menu source (API/local)

const overrides = {
  // name (case-insensitive) : public path
  'shawarma': '/images/menu/shawarma.jpg',
  'cheesy chicken wrap': '/images/menu/cheesy-chicken-wrap.jpg',
  'veg wrap': '/images/menu/veg-wrap.jpg',
  'paneer wrap': '/images/menu/paneer-wrap.jpg',
  'veg sandwich': '/images/menu/veg-sandwich.jpg',
  'paneer sandwich': '/images/menu/paneer-sandwich.jpg',
  'crispy chicken sandwich': '/images/menu/crispy-chicken-sandwich.jpg',
  'cheesy crispy chicken sandwich': '/images/menu/cheesy-crispy-chicken-sandwich.jpg',
};

const norm = (s = '') => String(s).trim().toLowerCase();

export function applyImageOverrides(menu = {}) {
  const out = {};
  for (const [category, items] of Object.entries(menu || {})) {
    out[category] = (items || []).map((it) => {
      const nameKey = norm(it?.name);
      const override = overrides[nameKey];
      if (override && !it?.image) {
        return { ...it, image: override };
      }
      return it;
    });
  }
  return out;
}

export default applyImageOverrides;
