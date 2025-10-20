// Node script to check Chicken ON/OFF status using strict logic (inStock === true is ON)
// Run via: node scripts/check_chicken_status.js
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
  const menu = JSON.parse(raw);

  let total = 0;
  let on = 0;
  let off = 0;
  const onList = [];
  const offList = [];
  const undefinedList = [];

  for (const category of Object.keys(menu || {})) {
    for (const p of menu[category] || []) {
  if (!isChickenProduct(p)) continue;
      total += 1;
      if (p?.inStock === true) {
        on += 1;
        onList.push(`${category} > ${p.name}`);
      } else if (p?.inStock === false) {
        off += 1;
        offList.push(`${category} > ${p.name}`);
      } else {
        // undefined treated as OFF in strict logic, but we report it separately
        off += 1;
        undefinedList.push(`${category} > ${p.name}`);
      }
    }
  }

  const nextIsOff = on > 0; // if any ON, next action is OFF
  const action = nextIsOff ? 'OFF' : 'ON';

  console.log('--- Chicken Status (strict: inStock === true is ON) ---');
  console.log('Total chicken items :', total);
  console.log('ON (inStock===true) :', on);
  console.log('OFF (incl. undefined):', off);
  console.log('Next action would be : Turn', action);
  if (onList.length) {
    console.log('\nItems currently ON:');
    onList.forEach((x) => console.log(' -', x));
  }
  if (undefinedList.length) {
    console.log('\nItems OFF due to undefined inStock (consider setting explicitly to false or true):');
    undefinedList.forEach((x) => console.log(' -', x));
  }
}

main();
