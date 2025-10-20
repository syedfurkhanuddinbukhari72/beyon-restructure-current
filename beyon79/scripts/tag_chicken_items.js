// One-time script to set isChicken flag for items whose names contain 'chicken'
// Run with: node scripts/tag_chicken_items.js
const fs = require('fs');
const path = require('path');

function main() {
  const menuPath = path.join(process.cwd(), 'data', 'menuData.json');
  if (!fs.existsSync(menuPath)) {
    console.error('menuData.json not found at', menuPath);
    process.exit(1);
  }
  const raw = fs.readFileSync(menuPath, 'utf-8');
  const menu = JSON.parse(raw || '{}');
  let updates = 0;
  for (const cat of Object.keys(menu || {})) {
    menu[cat] = (menu[cat] || []).map((p) => {
      if (!p) return p;
      const name = String(p.name || '').trim();
      const nameLooksChicken = /chicken/i.test(name);
      if (nameLooksChicken && p.isChicken !== true) {
        updates++;
        return { ...p, isChicken: true };
      }
      return p;
    });
  }
  if (updates === 0) {
    console.log('No items needed tagging.');
    return;
  }
  fs.writeFileSync(menuPath, JSON.stringify(menu, null, 2));
  console.log(`Tagged ${updates} items with isChicken: true.`);
}

main();
