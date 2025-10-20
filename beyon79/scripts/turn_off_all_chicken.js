// One-time script to turn OFF all chicken items (inStock=false)
// Detection: prefers isChicken flag, falls back to name contains 'chicken'
// Run with: node scripts/turn_off_all_chicken.js
const fs = require('fs');
const path = require('path');

function isChickenProduct(p) {
  if (!p) return false;
  if (p.isChicken === true) return true;
  return /chicken/i.test(String(p.name || '').trim());
}

function main() {
  const menuPath = path.join(process.cwd(), 'data', 'menuData.json');
  if (!fs.existsSync(menuPath)) {
    console.error('menuData.json not found at', menuPath);
    process.exit(1);
  }
  const raw = fs.readFileSync(menuPath, 'utf-8');
  const menu = JSON.parse(raw || '{}');

  let total = 0;
  let changed = 0;
  let alreadyOff = 0;

  for (const cat of Object.keys(menu || {})) {
    menu[cat] = (menu[cat] || []).map((p) => {
      if (!isChickenProduct(p)) return p;
      total++;
      if (p?.inStock === true) {
        changed++;
        return { ...p, inStock: false };
      } else {
        alreadyOff++;
        // ensure explicit boolean if undefined
        if (typeof p.inStock !== 'boolean') return { ...p, inStock: false };
        return p;
      }
    });
  }

  fs.writeFileSync(menuPath, JSON.stringify(menu, null, 2));
  console.log(`Processed chicken items: ${total}. Turned OFF: ${changed}. Already OFF: ${alreadyOff}.`);
}

main();
